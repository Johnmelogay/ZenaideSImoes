import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
};

type ReservedOrder = {
    id: string;
    payment_link: string | null;
    checkout_expires_at: string;
    items: Array<{ name: string; size_label: string | null; price: number; qty: number }>;
};

const reply = (body: object, status = 200) => Response.json(body, { status, headers });
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async request => {
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return reply({ error: 'Método indisponível.' }, 405);

    const handle = Deno.env.get('INFINITE_TAG')?.trim().replace(/^\$/, '');
    const apiKey = Deno.env.get('INFINITE_API_KEY');
    const { data: settings } = await db.from('store_settings').select('product_checkout_enabled').eq('id', 1).maybeSingle();
    if (!handle || !apiKey || !settings?.product_checkout_enabled) {
        return reply({ error: 'Para comprar esta peça, fale com a Zenaide pelo WhatsApp.' }, 503);
    }

    try {
        const { product_id, quantity, name, phone, order_id, size } = await request.json();
        const chosenSize = typeof size === 'string' ? size.trim().slice(0, 40) : '';
        if (typeof product_id !== 'string' || !/^\d{1,15}$/.test(product_id)
            || !Number.isInteger(quantity) || quantity < 1 || quantity > 20
            || typeof name !== 'string' || name.trim().length < 2 || name.length > 100
            || typeof phone !== 'string' || !/^\d{10,11}$/.test(phone)
            || typeof order_id !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(order_id)) {
            return reply({ error: 'Confira o nome, o WhatsApp com DDD e a quantidade.' }, 400);
        }

        const { data: order, error } = await db.rpc('reserve_product_checkout', {
            p_order_id: order_id, p_product_id: product_id, p_quantity: quantity, p_name: name, p_phone: phone, p_size: chosenSize || null,
        }).single().overrideTypes<ReservedOrder, { merge: false }>();
        if (error) {
            if (error.code === 'P0001' || error.code === 'P0002') {
                return reply({ error: error.message, restart: error.code === 'P0002' }, 409);
            }
            throw new Error('Falha na reserva do pedido');
        }
        if (!order) throw new Error('Reserva sem dados');
        if (order.payment_link) return reply({ url: order.payment_link });

        const { data: claimed, error: claimError } = await db.from('orders')
            .update({ checkout_link_started_at: new Date().toISOString() })
            .eq('id', order.id).is('checkout_link_started_at', null).select('id').maybeSingle();
        if (claimError) throw new Error('Falha ao iniciar pagamento');
        if (!claimed) return reply({ error: 'O link ainda está sendo preparado. Tente novamente em alguns instantes.' }, 409);

        const item = order.items[0];
        const response = await fetch('https://api.checkout.infinitepay.io/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
                handle,
                order_nsu: order.id,
                redirect_url: 'https://johnmelogay.github.io/ZenaideSImoes/',
                webhook_url: `${supabaseUrl}/functions/v1/infinitepay-webhook`,
                items: [{
                    description: item.size_label ? `${item.name} — ${item.size_label}` : item.name,
                    price: Math.round(Number(item.price) * 100),
                    quantity: item.qty,
                }],
                customer: { name: name.trim(), phone_number: `+55${phone}` },
                options: { single_payment: true, valid_until: order.checkout_expires_at },
            }),
        });
        if (!response.ok) throw new Error(`InfinitePay HTTP ${response.status}`);
        const { url } = await response.json();
        const checkoutUrl = new URL(url);
        if (checkoutUrl.protocol !== 'https:' || !/(^|\.)infinitepay\.io$/.test(checkoutUrl.hostname)) {
            throw new Error('Endereço de pagamento inválido');
        }

        const { error: saveError } = await db.from('orders').update({ payment_link: checkoutUrl.href }).eq('id', order.id);
        if (saveError) throw new Error('Falha ao salvar o link');
        return reply({ url: checkoutUrl.href });
    } catch (error) {
        console.error('product-checkout:', error instanceof Error ? error.message : 'falha');
        return reply({ error: 'O pagamento está indisponível agora. Tente novamente ou fale com a Zenaide.' }, 502);
    }
});
