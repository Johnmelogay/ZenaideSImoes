
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const productId = url.searchParams.get('id');

        if (!productId) {
            return new Response("Missing product ID", {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
            });
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
            return new Response("Product not found", {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        // Construct Meta Tags
        const title = `${product.name} | Zenaide Simões`;
        const description = `R$ ${Number(product.price).toFixed(2)} - Confira esta peça exclusiva!`;
        const image = product.image_url || product.image;

        // Deep link with correct casing
        const deepLink = `https://johnmelogay.github.io/ZenaideSImoes/#/produto/${productId}`;


        // Detect User-Agent to differentiate between bots (WhatsApp/Facebook) and real users
        const userAgent = req.headers.get('user-agent') || '';
        const isBot = /facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|Discordbot|LinkedInBot|Slackbot|SkypeUriPreview|Applebot/i.test(userAgent);

        // If it's a real user, redirect immediately (302) to avoid showing raw HTML
        if (!isBot) {
            return Response.redirect(deepLink, 302);
        }

        // If it's a bot, serve the HTML with Open Graph tags for preview
        const html = `<!DOCTYPE html>
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
</body>
</html>`;

        return new Response(html, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/html; charset=utf-8'
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
