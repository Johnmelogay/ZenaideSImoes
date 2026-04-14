/**
 * Optimize Existing Images in Supabase Storage
 * 
 * This script:
 * 1. Lists all files in the 'product-images' bucket
 * 2. Downloads each image
 * 3. Re-compresses it as WebP with optimal quality (60%)
 * 4. Re-uploads it with the same filename (overwrite)
 * 
 * Usage: node scripts/optimize-bucket-images.js
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

const SUPABASE_URL = 'https://bydedlfccgywqshzllmz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Set this env var before running
if (!SUPABASE_KEY) {
    console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY environment variable first');
    process.exit(1);
}
const BUCKET = 'product-images';
const MAX_WIDTH = 800;
const WEBP_QUALITY = 60;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listAllFiles() {
    const allFiles = [];
    let offset = 0;
    const limit = 100;

    while (true) {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });

        if (error) throw error;
        if (!data || data.length === 0) break;

        // Filter only image files (skip folders)
        const imageFiles = data.filter(f =>
            !f.id?.startsWith('.') &&
            f.name &&
            /\.(jpg|jpeg|png|webp|gif|bmp|tiff|heic|avif)$/i.test(f.name)
        );
        allFiles.push(...imageFiles);

        if (data.length < limit) break;
        offset += limit;
    }

    return allFiles;
}

async function optimizeImage(fileName) {
    try {
        // Download
        const { data: blob, error: downloadError } = await supabase.storage
            .from(BUCKET)
            .download(fileName);

        if (downloadError) {
            console.error(`  ❌ Download failed: ${fileName}`, downloadError.message);
            return { fileName, status: 'error', error: downloadError.message };
        }

        const buffer = Buffer.from(await blob.arrayBuffer());
        const originalSize = buffer.length;

        // Get metadata to check dimensions
        const metadata = await sharp(buffer).metadata();

        // Optimize: resize if needed + convert to WebP
        let pipeline = sharp(buffer);

        if (metadata.width > MAX_WIDTH) {
            pipeline = pipeline.resize(MAX_WIDTH, null, {
                withoutEnlargement: true,
                fit: 'inside'
            });
        }

        const optimizedBuffer = await pipeline
            .webp({ quality: WEBP_QUALITY, effort: 6 })
            .toBuffer();

        const newSize = optimizedBuffer.length;
        const savings = ((1 - newSize / originalSize) * 100).toFixed(1);

        // Skip if the optimized version is larger (already well-compressed)
        if (newSize >= originalSize) {
            console.log(`  ⏭️  ${fileName} — already optimal (${formatBytes(originalSize)})`);
            return { fileName, status: 'skipped', originalSize, newSize };
        }

        // Re-upload with the same name (upsert = overwrite)
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .update(fileName, optimizedBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) {
            console.error(`  ❌ Upload failed: ${fileName}`, uploadError.message);
            return { fileName, status: 'error', error: uploadError.message };
        }

        console.log(`  ✅ ${fileName} — ${formatBytes(originalSize)} → ${formatBytes(newSize)} (${savings}% saved)`);
        return { fileName, status: 'optimized', originalSize, newSize, savings };

    } catch (err) {
        console.error(`  ❌ Error processing: ${fileName}`, err.message);
        return { fileName, status: 'error', error: err.message };
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function main() {
    console.log('🔍 Listing files in bucket:', BUCKET);
    const files = await listAllFiles();
    console.log(`📁 Found ${files.length} image files\n`);

    if (files.length === 0) {
        console.log('No images found!');
        return;
    }

    let totalOriginal = 0;
    let totalNew = 0;
    let optimizedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process sequentially to avoid rate limits
    for (let i = 0; i < files.length; i++) {
        console.log(`[${i + 1}/${files.length}] Processing: ${files[i].name}`);
        const result = await optimizeImage(files[i].name);

        if (result.status === 'optimized') {
            totalOriginal += result.originalSize;
            totalNew += result.newSize;
            optimizedCount++;
        } else if (result.status === 'skipped') {
            skippedCount++;
        } else {
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADO FINAL');
    console.log('='.repeat(50));
    console.log(`✅ Otimizadas: ${optimizedCount}`);
    console.log(`⏭️  Já otimizadas: ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    if (optimizedCount > 0) {
        console.log(`💾 Espaço economizado: ${formatBytes(totalOriginal - totalNew)} (${((1 - totalNew / totalOriginal) * 100).toFixed(1)}%)`);
        console.log(`   Antes: ${formatBytes(totalOriginal)} → Depois: ${formatBytes(totalNew)}`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
