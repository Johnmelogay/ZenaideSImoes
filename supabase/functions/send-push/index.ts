import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { title, body, url, orderId } = await req.json()

        // VAPID config
        const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
        const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
        const VAPID_SUBJECT = 'mailto:johnmelocontato@gmail.com'

        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

        // Init Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch all push subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')

        if (error) throw error
        if (!subscriptions || subscriptions.length === 0) {
            console.log('No push subscriptions found')
            return new Response(JSON.stringify({ sent: 0 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        const payload = JSON.stringify({
            title: title || '🛍️ Novo Pedido Pago!',
            body: body || 'Verifique o painel.',
            url: url || './#/admin'
        })

        let sent = 0
        let failed = 0

        for (const sub of subscriptions) {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }
                await webpush.sendNotification(pushSubscription, payload)
                sent++
                console.log(`Push sent to ${sub.endpoint.slice(0, 50)}...`)
            } catch (pushError: any) {
                console.error(`Push failed for ${sub.endpoint.slice(0, 50)}:`, pushError.statusCode || pushError.message)
                failed++

                // Remove invalid subscriptions (expired/unsubscribed)
                if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                    console.log(`Removed stale subscription ${sub.id}`)
                }
            }
        }

        console.log(`Push results: ${sent} sent, ${failed} failed`)

        return new Response(
            JSON.stringify({ sent, failed, total: subscriptions.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (err: any) {
        console.error('Send-push error:', err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
