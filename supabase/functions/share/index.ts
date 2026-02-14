
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const productId = url.searchParams.get('id');

        if (!productId) {
            return new Response("Missing product ID", { status: 400 });
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            // @ts-ignore
            Deno.env.get('SUPABASE_URL') ?? '',
            // @ts-ignore
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Fetch Product
        const { data: product, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error || !product) {
            return new Response("Product not found", { status: 404 });
        }

        // Construct Meta Tags
        const title = `${product.name} | Zenaide Simões`;
        const description = `R$ ${Number(product.price).toFixed(2)} - Confira esta peça exclusiva!`;
        const image = product.image_url || product.image;
        // Deep link to the specific product in the PWA
        // Assuming the app is hosted at johnmelogay.github.io/ZenaideSImoes/
        const deepLink = `https://johnmelogay.github.io/ZenaideSImoes/#/produto/${productId}`;

        const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook / WhatsApp -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${deepLink}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">
        <meta property="og:image:width" content="800">
        <meta property="og:image:height" content="800">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${deepLink}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${image}">

        <meta http-equiv="refresh" content="0;url=${deepLink}">
      </head>
      <body>
        <p>Redirecionando para <a href="${deepLink}">${product.name}</a>...</p>
        <script>window.location.href = "${deepLink}";</script>
      </body>
      </html>
    `;

        return new Response(html, {
            headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
