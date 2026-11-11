import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
};

type Reserved = {
    id: string;
    total_amount: number;
    payment_link: string | null;
    checkout_expires_at: string;
};

const reply = (body: object, status = 200) => Response.json(body, { status, headers });
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = 'https://johnmelogay.github.io/ZenaideSImoes/';

Deno.serve(async request => {
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return reply({ error: 'Método indisponível.' }, 405);

    const handle = Deno.env.get('INFINITE_TAG')?.trim().replace(/^\$/, '');
    const apiKey = Deno.env.get('INFINITE_API_KEY');
    if (!handle || !apiKey) return reply({ error: 'Pagamento online indisponível.' }, 503);

    try {
        const body = await request.json();
        const token = String(body.token || '');
        const orderId = String(body.order_id || '');
        const name = String(body.name || '').trim();
        const phone = String(body.phone || '').replace(/\D/g, '');
        const email = String(body.email || '').trim();
        const quantity = Number(body.quantity);
        const size = typeof body.size === 'string' ? body.size.trim() : '';
        const delivery = body.delivery && typeof body.delivery === 'object' ? body.delivery : {};
        const address = body.address && typeof body.address === 'object' ? body.address : {};

        if (!/^[a-f0-9]{12,32}$/.test(token)) return reply({ error: 'Link inválido.' }, 400);
        if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(orderId)) return reply({ error: 'Pedido inválido.' }, 400);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return reply({ error: 'Quantidade inválida.' }, 400);
        if (name.length < 2 || name.length > 100) return reply({ error: 'Informe o nome de quem vai receber.' }, 400);
        if (!/^\d{10,11}$/.test(phone)) return reply({ error: 'Informe o WhatsApp com DDD.' }, 400);
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply({ error: 'Confira o e-mail.' }, 400);

        const fee = Math.max(0, Math.round(Number(delivery.fee || 0) * 100) / 100);
        const method = typeof delivery.label === 'string' ? delivery.label.slice(0, 120) : '';

        const { data, error } = await db.rpc('reserve_sales_link_checkout', {
            p_token: token,
            p_order_id: orderId,
            p_name: name,
            p_phone: phone,
            p_email: email,
            p_quantity: quantity,
            p_size: size,
            p_delivery_method: method,
            p_delivery_fee: fee,
            p_address: address,
        }).single().overrideTypes<Reserved, { merge: false }>();

        if (error) {
            if (error.code === 'P0001' || error.code === 'P0002') {
                return reply({ error: error.message, restart: error.code === 'P0002' }, 409);
            }
            console.error('reserve_sales_link_checkout', error.message);
            return reply({ error: 'Não foi possível reservar a peça agora.' }, 500);
        }
        if (!data) return reply({ error: 'Reserva sem dados.' }, 500);
        if (data.payment_link) return reply({ url: data.payment_link });

        const { data: link } = await db.from('sales_links')
            .select('title, image_url, price')
            .eq('token', token).maybeSingle();

        const items = [{
            description: size ? `${link?.title || name} — Tam. ${size}` : (link?.title || 'Peça Zenaide Simões'),
            price: Math.round(Number(link?.price || 0) * 100),
            quantity,
        }];
        if (fee > 0) items.push({ description: method || 'Entrega', price: Math.round(fee * 100), quantity: 1 });

        const response = await fetch('https://api.checkout.infinitepay.io/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify({
                handle,
                order_nsu: data.id,
                redirect_url: `${SITE}#/pedido/${token}`,
                webhook_url: `${supabaseUrl}/functions/v1/infinitepay-webhook`,
                items,
                customer: { name, phone_number: `+55${phone}` },
                options: { single_payment: true, valid_until: data.checkout_expires_at },
            }),
        });
        if (!response.ok) {
            console.error('infinitepay', response.status, await response.text());
            return reply({ error: 'O pagamento está indisponível agora. Tente novamente.' }, 502);
        }
        const { url } = await response.json();
        const checkoutUrl = new URL(url);
        if (checkoutUrl.protocol !== 'https:' || !/(^|\.)infinitepay\.io$/.test(checkoutUrl.hostname)) {
            return reply({ error: 'Endereço de pagamento inválido.' }, 502);
        }
        await db.from('orders').update({ payment_link: checkoutUrl.href }).eq('id', data.id);
        return reply({ url: checkoutUrl.href });
    } catch (error) {
        console.error('sales-link-checkout', error instanceof Error ? error.message : 'falha');
        return reply({ error: 'Não foi possível abrir o pagamento. Tente novamente.' }, 502);
    }
});
