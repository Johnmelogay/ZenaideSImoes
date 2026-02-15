
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
        const { order_id, items, customer, origin } = await req.json()
        const infiniteTag = Deno.env.get('INFINITE_TAG') || 'joao-melo-rio-preto';

        if (!infiniteTag) {
            throw new Error('Missing INFINITE_TAG configuration')
        }

        // Initialize Admin Client to update DB bypassing RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // --- SECURITY: Server-Side Price Validation ---
        // 1. Extract IDs to fetch from DB
        const productIds = items
            .filter((i: any) => i.id && typeof i.id === 'string' && i.price > 0)
            .map((i: any) => i.id);

        let dbProducts: any[] = [];
        if (productIds.length > 0) {
            const { data: dbData, error: dbError } = await supabaseAdmin
                .from('products')
                .select('id, price, name')
                .in('id', productIds);

            if (!dbError && dbData) {
                dbProducts = dbData;
            } else {
                console.error("Error fetching products for validation:", dbError);
            }
        }

        // 2. Rebuild items with Trusted Data
        const validatedItems = items.map((item: any) => {
            // Find authoritative product data
            const dbProduct = dbProducts.find(p => String(p.id) === String(item.id));
            if (dbProduct) {
                console.log(`Validating ${item.name}: Client Price ${item.price} -> DB Price ${dbProduct.price}`);
                return {
                    ...item,
                    price: Number(dbProduct.price), // OVERWRITE with Trusted Price
                    name: dbProduct.name // OVERWRITE with Trusted Name
                };
            }
            // Pass through discounts (negative price) or custom items not in DB
            return item;
        });

        // Helper to parse price
        const parsePrice = (p: any) => {
            if (typeof p === 'number') return p;
            if (typeof p === 'string') {
                return parseFloat(p.replace(/[^\\d,.-]/g, '').replace(',', '.'));
            }
            return 0;
        };

        // Helper to format phone
        const formatPhone = (phone: string) => {
            const numbers = phone.replace(/\D/g, '');
            // If it starts with 55, keep it. If not, add it.
            if (numbers.startsWith('55') && numbers.length > 11) {
                return `+${numbers}`;
            }
            return `+55${numbers}`;
        };

        // 3. Calculate total in cents using VALIDATED items
        const totalCents = validatedItems.reduce((acc: number, item: any) => {
            const price = parsePrice(item.price);
            return acc + Math.round(price * 100);
        }, 0);

        // 4. Format items for InfinitePay using VALIDATED items
        const paymentItems = validatedItems.map((item: any) => {
            const price = parsePrice(item.price);
            return {
                id: String(item.id || 'custom'),
                description: item.name,
                price: Math.round(price * 100), // Correct field matches API docs
                quantity: 1
            };
        });

        // Determine Redirect URL
        // HARDCODED FIX: Correct GitHub Pages path (case-sensitive!)
        let redirectUrl = "https://johnmelogay.github.io/ZenaideSImoes/#/sucesso";

        if (origin && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
            redirectUrl = "http://localhost:3000/#/sucesso";
        }

        console.log("Constructed Redirect URL:", redirectUrl);

        // 3. Prepare Payload
        const payload = {
            handle: infiniteTag.replace('$', ''),
            description: `Pedido #${order_id.slice(0, 8)} - Zenaide Simoes`,
            amount: totalCents,
            order_nsu: order_id,
            redirect_url: redirectUrl,
            notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/infinitepay-webhook`, // Dynamic
            items: paymentItems,
            customer: {
                email: customer.email || "cliente@zenaide.com",
                name: customer.name || 'Cliente',
                phone_number: formatPhone(customer.phone || '11999999999'),
                address: customer.address ? {
                    street: customer.address.street,
                    number: customer.address.number,
                    neighborhood: customer.address.neighborhood,
                    city: customer.address.city,
                    state: customer.address.state,
                    zipcode: customer.address.zipcode.replace(/\D/g, ''),
                    complement: customer.address.complement || ''
                } : undefined
            }
        };

        console.log("Sending payload to InfinitePay:", JSON.stringify(payload));

        // 4. Call InfinitePay API
        // Public Endpoint

        console.log("Calling InfinitePay Public API...");

        const response = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json()
        console.log("InfinitePay Response:", data);

        if (!response.ok) {
            console.error("InfinitePay Failed:", response.status, response.statusText, data);
            throw new Error(`InfinitePay Error (${response.status}): ${JSON.stringify(data)}`)
        }

        // 5. SAVE LINK TO DB (Fix for empty payment_link)
        const checkoutUrl = data.checkout_url || data.url;
        if (checkoutUrl) {
            await supabaseAdmin.from('orders').update({ payment_link: checkoutUrl }).eq('id', order_id);
        }

        // Return the checkout URL
        return new Response(
            JSON.stringify({ url: data.checkout_url || data.url, metadata: data }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Error generating checkout:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
