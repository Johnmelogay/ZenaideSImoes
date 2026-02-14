
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log("Webhook Payload received:", JSON.stringify(payload));

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Extract Information
        // InfinitePay Webhook structure varies, but we expect 'data' or root fields.
        // We sent 'order_nsu' as our internal order_id.
        // Common fields: event, data { id, attributes { status, metadata... } }

        // Strategy: Look for order_nsu or metadata.order_id
        let orderId = payload.order_nsu || payload?.data?.attributes?.order_nsu || payload?.metadata?.order_id;

        // If strict path fails, try finding it in the whole object (naive search) if needed, 
        // but order_nsu at root is most likely based on our checkout creation.

        const status = payload.status || payload?.data?.attributes?.status; // e.g. 'paid', 'approved'
        const transactionId = payload.id || payload?.data?.id;

        if (!orderId) {
            console.error("No Order ID found in payload");
            return new Response(JSON.stringify({ error: "No Order ID found" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // Map InfinitePay status to our status
        // InfinitePay: 'approved', 'paid', 'canceled', 'refused'
        // Our DB: 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'

        let dbStatus = 'pending';
        const s = String(status).toLowerCase();
        console.log(`Processing status: ${s} for Order ${orderId}`);

        if (['paid', 'approved', 'succeeded', 'completed'].includes(s)) {
            dbStatus = 'paid';
        } else if (['canceled', 'refused', 'failed', 'refunded'].includes(s)) {
            dbStatus = 'cancelled';
        } else {
            console.log(`Status '${s}' does not require DB update (keeping pending).`);
            // Default to not updating unless it satisfies a condition, 
            // but if we want to track 'created' etc, we could.
        }

        // Update Database
        if (dbStatus !== 'pending') {
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: dbStatus,
                    payment_status: dbStatus, // Keep both columns in sync
                    payment_id: transactionId,
                    infinite_metadata: payload, // save full payload for debug
                })
                .eq('id', orderId);

            if (updateError) {
                console.error("Error updating order:", updateError);
                throw updateError;
            }
            console.log(`Order ${orderId} updated to ${dbStatus}`);

            // DECREMENT STOCK IF PAID
            if (dbStatus === 'paid') {
                const { data: orderData, error: fetchError } = await supabase
                    .from('orders')
                    .select('items')
                    .eq('id', orderId)
                    .single();

                if (orderData?.items) {
                    for (const item of orderData.items) {
                        if (item.id) {
                            await supabase.rpc('decrement_stock', {
                                product_id: item.id,
                                quantity: 1 // We force 1 for now as cart doesn't seem to support qty > 1 per item line properly yet, or we check item.quantity
                            });
                        }
                    }
                    console.log(`Stock decremented for order ${orderId}`);
                }

                // SEND PUSH NOTIFICATION
                try {
                    const { data: fullOrder } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .single();

                    const customerName = fullOrder?.customer_name || fullOrder?.customer_email || 'Cliente';
                    const total = Number(fullOrder?.total || 0).toFixed(2);
                    const itemCount = fullOrder?.items?.length || 0;

                    const pushRes = await fetch(
                        `${supabaseUrl}/functions/v1/send-push`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${supabaseKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                title: `🛍️ Novo Pedido — R$ ${total}`,
                                body: `${customerName} • ${itemCount} item(s)`,
                                url: `./#/admin`,
                                orderId: orderId
                            })
                        }
                    );
                    console.log(`Push notification sent: ${pushRes.status}`);
                } catch (pushErr) {
                    console.error('Push notification error (non-fatal):', pushErr);
                }
            }
        } else {
            // Just log metadata if status isn't one we care about changing (like 'created')
            await supabase.from('orders').update({ infinite_metadata: payload }).eq('id', orderId);
        }

        return new Response(
            JSON.stringify({ message: "Webhook processed", order_id: orderId, new_status: dbStatus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
