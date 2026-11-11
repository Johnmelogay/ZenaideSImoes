import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: object, status = 200) => Response.json(body, { status, headers });
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(supabaseUrl, serviceKey);

Deno.serve(async request => {
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return reply({ error: 'Método indisponível.' }, 405);

    try {
        const payload = await request.json();
        const orderId = payload.order_nsu;
        const slug = payload.invoice_slug || payload.slug;
        const transaction = payload.transaction_nsu;
        if (typeof orderId !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(orderId)
            || typeof slug !== 'string' || slug.length < 1 || slug.length > 160
            || typeof transaction !== 'string' || transaction.length < 1 || transaction.length > 160) {
            return reply({ error: 'Dados insuficientes para confirmar o pagamento.' }, 400);
        }

        const handle = Deno.env.get('INFINITE_TAG')?.trim().replace(/^\$/, '');
        if (!handle) return reply({ error: 'Pagamento indisponível.' }, 503);
        const apiKey = Deno.env.get('INFINITE_API_KEY');
        const verification = await fetch('https://api.checkout.infinitepay.io/payment_check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-Api-Key': apiKey } : {}) },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({ handle, order_nsu: orderId, transaction_nsu: transaction, slug }),
        });
        if (!verification.ok) return reply({ error: 'Confirmação indisponível.' }, 502);
        const payment = await verification.json();
        if (payment.success !== true || payment.paid !== true || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) {
            return reply({ paid: false });
        }

        const { data: result, error } = await db.rpc('record_verified_payment', {
            p_order_id: orderId, p_transaction: transaction, p_amount_cents: payment.amount,
        });
        if (error) throw new Error('Falha ao registrar confirmação');
        if (result === 'paid' || result === 'paid_stock_review') {
            EdgeRuntime.waitUntil(fetch(`${supabaseUrl}/functions/v1/send-push`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Novo pedido pago',
                    body: result === 'paid_stock_review'
                        ? 'Abra o painel para conferir o estoque antes de preparar a entrega.'
                        : 'Abra o painel para preparar a entrega.',
                    url: './#/admin',
                }),
            }).then(response => {
                if (!response.ok) console.error('Falha no aviso do pedido pago', response.status);
            }).catch(() => console.error('Falha de rede no aviso do pedido pago')));
        }
        if (result === 'paid' || result === 'paid_stock_review' || result === 'already_paid') {
            const { data: paidOrder } = await db.from('orders')
                .select('sales_link_token').eq('id', orderId).maybeSingle();
            if (paidOrder?.sales_link_token) {
                await db.from('sales_links')
                    .update({ status: 'sold' })
                    .eq('token', paidOrder.sales_link_token)
                    .eq('status', 'active');
            }
        }
        if (result === 'amount_mismatch' || result === 'different_transaction') {
            console.error('Pagamento precisa de conciliação', orderId, result);
        }
        return reply({ paid: ['paid', 'paid_stock_review', 'already_paid'].includes(result) });
    } catch {
        console.error('Falha ao confirmar pagamento InfinitePay');
        return reply({ error: 'Não foi possível verificar o pagamento agora.' }, 502);
    }
});
