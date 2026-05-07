/**
 * Image Processing Helpers — Shared utilities for scraper skills.
 *
 * Unified image processing wrapper used by:
 *   - booking-scraper
 *   - tour-scraper
 *   - activity-scraper
 *
 * Features:
 *   - Download files from URLs
 *   - Convert to WebP using sharp
 *   - Upload to Firebase Storage
 *   - Batch processing with concurrency control
 *   - URL normalization for booking.com images
 *
 * @module image-helpers
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// ─────────────────────────────────────────────────────────────────────────────
// Download
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default User-Agent header for HTTP requests.
 * Mimics a modern Chrome browser to avoid blocks.
 */
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

/**
 * Download a file from URL.
 * Handles HTTP/HTTPS, follows redirects (3xx), and respects timeout.
 *
 * @param {string} url - URL to download
 * @param {number} [timeout=30000] - Timeout in milliseconds
 * @returns {Promise<Buffer>} Downloaded file buffer
 * @throws {Error} If download fails or times out
 */
export async function downloadFile(url, timeout = 30000) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, {
      timeout,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
      },
    }, (response) => {
      // Handle redirects (3xx status codes)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = new URL(response.headers.location, url).toString();
        downloadFile(redirectUrl, timeout).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error(`Timeout after ${timeout}ms`));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default WebP conversion options.
 */
const DEFAULT_WEBP_OPTIONS = {
  quality: 85,
  effort: 4,
  maxWidth: 1920,
  maxHeight: undefined,
};

/**
 * Convert image buffer to WebP format.
 * Uses sharp library for high-quality conversion with resize support.
 *
 * @param {Buffer} inputBuffer - Input image buffer
 * @param {object} [options] - Conversion options
 * @param {number} [options.quality=85] - WebP quality (1-100)
 * @param {number} [options.effort=4] - Compression effort (0-6)
 * @param {number} [options.maxWidth=1920] - Maximum width (resize if larger)
 * @param {number} [options.maxHeight] - Maximum height (optional)
 * @returns {Promise<Buffer>} WebP image buffer
 * @throws {Error} If sharp is not installed or conversion fails
 */
export async function toWebP(inputBuffer, options = {}) {
  const opts = { ...DEFAULT_WEBP_OPTIONS, ...options };

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error('sharp is not installed. Run: npm install sharp');
  }

  let image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // Resize if dimensions exceed max
  if (opts.maxWidth && metadata.width > opts.maxWidth) {
    image = image.resize({
      width: opts.maxWidth,
      withoutEnlargement: true,
    });
  }

  if (opts.maxHeight && metadata.height > opts.maxHeight) {
    image = image.resize({
      height: opts.maxHeight,
      withoutEnlargement: true,
    });
  }

  return image.webp({
    quality: opts.quality,
    effort: opts.effort,
  }).toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default content type for uploaded images.
 */
const DEFAULT_CONTENT_TYPE = 'image/webp';

/**
 * Default cache control header for immutable images.
 */
const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * Upload a buffer to Firebase Storage.
 * Saves file with public read access and returns the public URL.
 *
 * @param {import('firebase-admin').storage.Bucket} bucket - Storage bucket instance
 * @param {string} path - Storage path (e.g., 'hotels/my-hotel/featured.webp')
 * @param {Buffer} buffer - File buffer to upload
 * @param {string} [contentType='image/webp'] - Content type
 * @returns {Promise<string>} Public URL of uploaded file
 * @throws {Error} If upload fails
 */
export async function uploadToStorage(bucket, path, buffer, contentType = DEFAULT_CONTENT_TYPE) {
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: DEFAULT_CACHE_CONTROL,
    },
  });

  await file.makePublic();

  // Return public URL
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}



// ─────────────────────────────────────────────────────────────────────────────
// URL Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CDN-specific normalization rules.
 * Each rule maps a CDN hostname pattern to a size normalization function.
 * @constant {Array<{pattern: RegExp, normalize: (url: string, maxWidth: number) => string}>}
 */
const CDN_NORMALIZATION_RULES = [
  {
    // booking.com images: cf.bstatic.com/xdata/images/.../max500/...jpg
    pattern: /cf\.bstatic\.com/,
    normalize: (url, maxWidth) =>
      url
        .replace(/\/max\d+\//g, `/max${maxWidth}x768/`)
        .replace(/\/max\d+x\d+\//g, `/max${maxWidth}x768/`),
  },
  {
    // ivivu.com images: cdn2.ivivu.com/.../ivivu-name-DIMxDIMM.ext
    // Has multiple size variants: 570x320, 750x460, 930x520, 1200x800, 158x100, 105x72, 145x90, 360x225
    // Strategy: upsample to 1200x800 for consistency
    pattern: /cdn\d*\.ivivu\.com/,
    normalize: (url) =>
      url.replace(/\/\d{2,4}x\d{2,4}(\.\w+)$/, '/1200x800$1'),
  },
  {
    // Generic CDN pattern: any URL with DIMxDIM size segment
    // Falls back to preserving max available dimension
    pattern: /\/\d{2,4}x\d{2,4}\//,
    normalize: (url, maxWidth) =>
      url.replace(/\/\d{2,4}x\d{2,4}\//, `/${maxWidth}x${Math.round(maxWidth * 0.75)}/`),
  },
];

/**
 * Normalize image URL to target resolution across multiple CDNs.
 * Handles booking.com (cf.bstatic.com), ivivu.com (cdn*.ivivu.com),
 * and generic CDN patterns with embedded size dimensions.
 *
 * @param {string} url - Image URL from any supported CDN
 * @param {number} [maxWidth=1024] - Target max width for the image
 * @returns {string} Normalized URL with target resolution
 */
export function normalizeImageUrl(url, maxWidth = 1024) {
  if (!url || typeof url !== 'string') return url;

  for (const rule of CDN_NORMALIZATION_RULES) {
    if (rule.pattern.test(url)) {
      return rule.normalize(url, maxWidth);
    }
  }

  return url;
}

/**
 * Deduplicate gallery images by base name, keeping the highest resolution variant.
 * Handles CDNs that serve the same image at multiple sizes (e.g. 570x320, 750x460, 105x72).
 *
 * @param {string[]} urls - Array of image URLs potentially with duplicates at different sizes
 * @returns {string[]} Deduplicated URLs with only the highest resolution per image
 */
export function deduplicateByContent(urls) {
  if (!Array.isArray(urls)) return [];

  const imgMap = new Map();

  for (const url of urls) {
    // Extract a content-based key: filename before dimension/size suffix
    // e.g. "ivivu-hon-thom-khu-vui-choi" from "...ivivu-hon-thom-khu-vui-choi-570x320.gif"
    const nameMatch = url.match(/([^/]+?)(?:-\d+x\d+)?\.\w+$/);
    if (!nameMatch) continue;

    const baseName = nameMatch[1];
    const dimMatch = url.match(/\/?(\d+)x(\d+)/);
    const size = dimMatch ? parseInt(dimMatch[1]) * parseInt(dimMatch[2]) : 0;

    if (!imgMap.has(baseName) || imgMap.get(baseName).size < size) {
      imgMap.set(baseName, { url, size });
    }
  }

  return [...imgMap.values()].map((v) => v.url);
}

// [DEAD CODE] — DEFAULT_IMAGE_PATTERN, IVIVU_IMAGE_PATTERN, extractImageUrls:
// Never imported by any skill script (skills define their own local extractImageUrls)
// const DEFAULT_IMAGE_PATTERN = /https:\/\/cf\.bstatic\.com\/xdata\/images[^\s"'<>]+/g;
// const IVIVU_IMAGE_PATTERN = /https:\/\/cdn\d*\.ivivu\.com\/[^\s"'<>]+\.(?:gif|jpg|jpeg|png|webp)/g;
// export function extractImageUrls(text, pattern = DEFAULT_IMAGE_PATTERN) {
//   if (!text || typeof text !== 'string') return [];
//   const matches = text.match(pattern);
//   return matches || [];
// }

/**
 * Remove duplicate URLs from an array.
 * Preserves the original order of first occurrence.
 *
 * @param {string[]} urls - Array of URLs
 * @returns {string[]} Array with duplicates removed
 */
export function deduplicateUrls(urls) {
  if (!Array.isArray(urls)) return [];

  const seen = new Set();
  return urls.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full pipeline: download → WebP → upload.
 * Downloads image from URL, converts to WebP, uploads to Storage.
 *
 * @param {string} url - Image URL to process
 * @param {string} storagePath - Path in Storage (e.g., 'hotels/my-hotel/featured.webp')
 * @param {import('firebase-admin').storage.Bucket} bucket - Storage bucket
 * @param {object} [options] - Conversion options
 * @param {number} [options.quality=85] - WebP quality
 * @param {number} [options.maxWidth=1920] - Max width for resize
 * @returns {Promise<string>} Public URL of uploaded image
 * @throws {Error} If any step fails
 */
export async function processAndUploadImage(url, storagePath, bucket, options = {}) {
  // Download
  const rawBuffer = await downloadFile(url);

  // Convert to WebP
  const webpBuffer = await toWebP(rawBuffer, options);

  // Upload
  const publicUrl = await uploadToStorage(bucket, storagePath, webpBuffer);

  return publicUrl;
}

export async function processGalleryImages(urls, storageDir, bucket, options = {}) {
  const { maxImages = 50, quality = 85, concurrency = 5 } = options;
  const limitedUrls = urls.slice(0, maxImages);
  const results = [];
  for (let i = 0; i < limitedUrls.length; i += concurrency) {
    const batch = limitedUrls.slice(i, i + concurrency);
    const batchPromises = batch.map((url, batchIndex) => {
      const index = i + batchIndex;
      const paddedIndex = String(index + 1).padStart(2, '0');
      const storagePath = `${storageDir}/${paddedIndex}.webp`;
      return processAndUploadImage(url, storagePath, bucket, { quality })
        .then((publicUrl) => ({ success: true, url: publicUrl, index }))
        .catch((error) => ({ success: false, error: error.message, index }));
    });
    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      if (result.success) results[result.index] = result.url;
      else console.warn(`   ⚠️ Gallery image ${result.index + 1} failed: ${result.error}`);
    }
  }
  return results.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Processing Helpers
// ─────────────────────────────────────────────────────────────────────────────
export async function processImagesWithResults(urls, storageDir, bucket, options = {}) {
  const { quality = 85 } = options;
  const promises = urls.map(async (url, index) => {
    const paddedIndex = String(index + 1).padStart(2, '0');
    const storagePath = `${storageDir}/${paddedIndex}.webp`;
    try {
      const publicUrl = await processAndUploadImage(url, storagePath, bucket, { quality });
      return { url: publicUrl, success: true };
    } catch (error) {
      return { url: null, success: false, error: error.message };
    }
  });
  return Promise.all(promises);
}