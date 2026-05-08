/**
 * Blog #1 Image Pipeline — Download → Optimize → Upload Storage → Return URLs
 * 
 * Images from VnExpress CDN: download, convert to WebP, upload to Firebase Storage.
 * Uses sharp for optimization, firebase-admin for Storage upload.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Init
// ─────────────────────────────────────────────────────────────────────────────

const projectRoot = '/home/rubbypink/projects/tripphuquoc-db-fs';
const serviceAccountPath = path.resolve(projectRoot, 'tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  if (serviceAccount.privateKey) {
    serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'tripphuquoc-db-fs.firebasestorage.app',
  });
}

const bucket = admin.storage().bucket();

// ─────────────────────────────────────────────────────────────────────────────
// Image Sources (VnExpress CDN)
// ─────────────────────────────────────────────────────────────────────────────

const images = [
  {
    id: 'IMG-01',
    url: 'https://i1-dulich.vnecdn.net/2026/04/10/sun-6-5135-1775792406.jpg?w=0&h=0&q=100&dpr=2&fit=crop&s=ozmsyDFAVrumPoUzsohFkg',
    role: 'featured',
    alt: 'Toàn cảnh Nam đảo Phú Quốc nhìn từ trên cao — Thị trấn Hoàng Hôn rực rỡ bên bờ biển xanh ngọc bích',
    width: 1200,
  },
  {
    id: 'IMG-02',
    url: 'https://i1-dulich.vnecdn.net/2026/04/10/Soaking-in-the-European-vibes-6573-1245-1775793486.jpg?w=0&h=0&q=100&dpr=1&fit=crop&s=LyquL0wKoQLGbKOqr1cC6Q',
    role: 'inline',
    alt: 'Xe điện buggy đưa đón du khách dạo quanh những con đường rực rỡ sắc màu tại Thị trấn Hoàng Hôn',
    width: 800,
  },
  {
    id: 'IMG-03',
    url: 'https://iv1.vnecdn.net/dulich/images/web/2026/04/08/ngam-hoang-hon-tren-cau-hon-1775631347.jpg?w=0&h=0&q=100&dpr=1&fit=crop&s=gvXp2Ys5Ny1psgj_f23-bw',
    role: 'inline',
    alt: 'Hoàng hôn rực đỏ trên Cầu Hôn — hai nhánh cầu chạm nhau tạo khoảnh khắc lãng mạn khó quên giữa biển trời Phú Quốc',
    width: 800,
  },
  {
    id: 'IMG-04',
    url: 'https://i1-dulich.vnecdn.net/2026/04/10/IMG-3819-JPG-1775631425-7856-1775793487.jpg?w=0&h=0&q=100&dpr=1&fit=crop&s=74ZTEZSA8Kac07bq7uoSJg',
    role: 'inline',
    alt: 'Chợ đêm VuiFest Bazaar rực rỡ ánh đèn ven biển tại Sunset Town — thiên đường ẩm thực và mua sắm về đêm',
    width: 800,
  },
  {
    id: 'IMG-05',
    url: 'https://i1-dulich.vnecdn.net/2026/04/10/IMG-3680-1775628112-4090-1775793486.jpg?w=0&h=0&q=100&dpr=1&fit=crop&s=y8XeYJtPjI5MQ4bLPvvngA',
    role: 'inline',
    alt: 'Du khách dạo bước trên bãi cát trắng hoang sơ tại Hòn Mây Rút — một trong những hòn đảo đẹp nhất quần đảo An Thới',
    width: 800,
  },
];

const slug = 'cam-nang-du-lich-nam-dao-phu-quoc-2026';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function downloadFile(url, destPath) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Referer': 'https://vnexpress.net/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

async function optimizeImage(inputPath, outputPath, width) {
  await sharp(inputPath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(outputPath);
  
  const stats = fs.statSync(outputPath);
  const inputStats = fs.statSync(inputPath);
  return {
    outputSizeKB: Math.round(stats.size / 1024),
    inputSizeKB: Math.round(inputStats.size / 1024),
    compressionRatio: Math.round((1 - stats.size / inputStats.size) * 100),
  };
}

async function uploadToStorage(localPath, storagePath) {
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  
  // Get signed URL (valid for 10 years)
  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Blog #1 Image Pipeline — Starting...\n');
  
  const results = [];
  const featuredImage = { url: null, alt: null };
  
  for (const img of images) {
    const placeholder = `[${img.id}-URL]`;
    console.log(`📥 [${img.id}] Downloading: ${img.url}`);
    
    const ext = path.extname(new URL(img.url).pathname) || '.jpg';
    const rawPath = path.join(__dirname, `${img.id}_raw${ext}`);
    const webpPath = path.join(__dirname, `${img.id}.webp`);
    
    try {
      // Step 1: Download
      await downloadFile(img.url, rawPath);
      
      // Step 2: Optimize
      const stats = await optimizeImage(rawPath, webpPath, img.width);
      
      // Step 3: Upload to Storage
      const storagePath = `blogs/${slug}/${img.id.toLowerCase()}.webp`;
      const storageUrl = await uploadToStorage(webpPath, storagePath);
      
      // Cleanup temp files
      fs.unlinkSync(rawPath);
      fs.unlinkSync(webpPath);
      
      console.log(`  ✅ [${img.id}] Done — ${stats.outputSizeKB}KB (${stats.compressionRatio}% smaller) — ${storageUrl.substring(0, 80)}...`);
      
      const result = { placeholder, storageUrl, storagePath, role: img.role, alt: img.alt, stats };
      results.push(result);
      
      if (img.role === 'featured') {
        featuredImage.url = storageUrl;
        featuredImage.alt = img.alt;
      }
    } catch (err) {
      console.error(`  ❌ [${img.id}] Failed: ${err.message}`);
      results.push({ placeholder, error: err.message });
    }
  }
  
  console.log('\n📊 Summary:');
  results.forEach(r => {
    if (r.error) {
      console.log(`  ${r.placeholder} → ERROR: ${r.error}`);
    } else {
      console.log(`  ${r.placeholder} → ${r.storagePath}`);
    }
  });
  
  console.log(`\n✅ Featured Image URL: ${featuredImage.url}`);
  console.log(`✅ Featured Image ALT: ${featuredImage.alt}`);
  
  // Output JSON for the save script
  const output = { results, featuredImage };
  fs.writeFileSync(path.join(__dirname, 'blog1-images.json'), JSON.stringify(output, null, 2));
  console.log('\n💾 Results saved to blog1-images.json');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
