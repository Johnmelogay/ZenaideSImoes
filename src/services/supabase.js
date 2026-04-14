import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bydedlfccgywqshzllmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZGVkbGZjY2d5d3FzaHpsbG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjE5MTUsImV4cCI6MjA4NjQzNzkxNX0.wa_gQajiyvhO0-cjyBPrBST74Y9JIEW64vniU8i_EVw';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Transforms a Supabase Storage public URL into an optimized image URL
 * using Supabase Image Transformations (Pro plan feature).
 * 
 * @param {string} url - Original public URL from Supabase Storage
 * @param {object} options - Transformation options
 * @param {number} [options.width] - Target width (1-2500)
 * @param {number} [options.height] - Target height (1-2500)
 * @param {number} [options.quality=60] - Quality (20-100)
 * @param {'cover'|'contain'|'fill'} [options.resize='cover'] - Resize mode
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(url, { width, height, quality = 60, resize = 'cover' } = {}) {
    if (!url || typeof url !== 'string') return url;
    // Only transform Supabase Storage URLs
    if (!url.includes('supabase.co/storage/v1/object/public/')) return url;

    let optimizedUrl = url.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
    );

    const params = new URLSearchParams();
    if (width) params.set('width', String(width));
    if (height) params.set('height', String(height));
    params.set('quality', String(quality));
    params.set('resize', resize);

    optimizedUrl += (optimizedUrl.includes('?') ? '&' : '?') + params.toString();
    return optimizedUrl;
}

// Presets for common use cases
export const imagePresets = {
    thumbnail: { width: 400, quality: 50 },       // Product grid cards
    small: { width: 160, quality: 50 },            // Cart items, order items
    medium: { width: 800, quality: 65 },           // Product detail gallery
    // fullscreen: no transformation (use original URL)
};
