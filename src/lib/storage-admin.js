/**
 * Firebase Admin Storage utility — resolve image URLs on the server side.
 *
 * Uses Admin SDK to generate signed URLs for Firebase Storage files.
 * Intended for Server Components and API routes only.
 *
 * @see storage.js for Client SDK version (upload/download in browser)
 */

import admin from 'firebase-admin';
import './firebase-admin';

let _bucket = null;
function getBucket() {
  if (!_bucket) _bucket = admin.storage().bucket();
  return _bucket;
}

/**
 * Resolve a Firebase Storage path to a downloadable HTTPS URL via Admin SDK.
 * Handles: full HTTP URLs (pass-through), gs:// paths, relative Storage paths.
 *
 * @param {string|null|undefined} imagePath
 * @returns {Promise<string|null>} Downloadable HTTPS URL or null
 */
export async function getStorageImageUrl(imagePath) {
  if (!imagePath) return null;

  if (
    typeof imagePath === "string" &&
    (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
  ) {
    return imagePath;
  }

  let objectPath = "";
  if (typeof imagePath === "string" && imagePath.startsWith("gs://")) {
    objectPath = imagePath.replace(/^gs:\/\/[^\/]+\//, "");
  } else if (typeof imagePath === "string") {
    objectPath = imagePath;
  }

  if (!objectPath) return null;

  try {
    const bucket = getBucket();
    const [url] = await bucket.file(objectPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    return url;
  } catch (error) {
    console.error("[storage-admin] getStorageImageUrl error:", objectPath, error.message);

    // Fallback: construct public URL (works if bucket allows public read)
    try {
      const bucket = getBucket();
      const encodedPath = encodeURIComponent(objectPath);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    } catch {
      return null;
    }
  }
}

/**
 * Resolve all image fields in a Firestore document to full HTTPS download URLs.
 * Identical logic to storage.js:resolveDocImages but uses Admin Storage SDK.
 *
 * @param {Object} doc - Firestore document (already serialized)
 * @returns {Promise<Object>} Document with resolved image URLs
 */
export async function resolveDocImages(doc) {
  if (!doc || typeof doc !== "object") return doc;

  const imageFields = ["featuredImage", "gallery", "images", "media", "logo"];
  const result = { ...doc };

  for (const field of imageFields) {
    if (result[field]) {
      if (Array.isArray(result[field])) {
        const resolved = await Promise.all(
          result[field].map((url) => getStorageImageUrl(url))
        );
        result[field] = resolved.filter(Boolean);
      } else if (typeof result[field] === "string") {
        const resolved = await getStorageImageUrl(result[field]);
        result[field] = resolved || result[field];
      }
    }
  }

  if (result.rooms) {
    if (Array.isArray(result.rooms)) {
      result.rooms = await Promise.all(
        result.rooms.map((room) => resolveDocImages(room))
      );
    } else if (typeof result.rooms === "object") {
      const resolvedRooms = {};
      const roomKeys = Object.keys(result.rooms);
      for (const key of roomKeys) {
        resolvedRooms[key] = await resolveDocImages(result.rooms[key]);
      }
      result.rooms = resolvedRooms;
    }
  }

  return result;
}

/**
 * Resolve images for multiple documents in parallel.
 * @param {Object[]} docs - Array of Firestore documents
 * @returns {Promise<Object[]>} Documents with resolved image URLs
 */
export async function resolveDocsImages(docs) {
  if (!Array.isArray(docs)) return docs;
  return Promise.all(docs.map((doc) => resolveDocImages(doc)));
}

// ─── HTML Content Image Resolution ─────────────────────────────────────

/**
 * Resolve Firebase Storage image URLs inside HTML content and add lazy loading.
 *
 * Scans an HTML string for <img> tags. For each tag:
 *  1. If `src` points to a Storage path (gs:// or relative), resolves it to an
 *     HTTPS download URL via the Admin SDK.
 *  2. If `src` is already an HTTP URL, leaves it unchanged.
 *  3. Adds `loading="lazy"` to every <img> that doesn't already have it.
 *  4. Adds `decoding="async"` for non-blocking decode.
 *
 * This is designed for the blog `content` field which stores rich HTML that may
 * embed Storage images inline.
 *
 * @param {string} htmlContent - Raw HTML string that may contain <img> tags
 * @returns {Promise<string>} HTML string with resolved URLs and lazy-load attrs
 * @updated 2025-05-08
 */
export async function resolveHtmlImages(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;

  const imgRegex = /<img\s+([^>]*?)>/gi;
  const matches = [...htmlContent.matchAll(imgRegex)];

  if (matches.length === 0) return htmlContent;

  // Resolve each <img> tag in parallel
  const processedTags = await Promise.all(
    matches.map(async (match) => {
      const attrs = match[1];

      // Extract src value
      const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
      let newAttrs = attrs;

      if (srcMatch) {
        const originalSrc = srcMatch[1];

        // Resolve non-HTTP Storage paths to signed HTTPS URLs
        if (!originalSrc.startsWith('http://') && !originalSrc.startsWith('https://')) {
          const resolvedUrl = await getStorageImageUrl(originalSrc);
          if (resolvedUrl) {
            newAttrs = newAttrs.replace(srcMatch[0], `src="${resolvedUrl}"`);
          }
        }
      }

      // Add lazy loading if not already present
      if (!/loading\s*=/i.test(newAttrs)) {
        newAttrs += ' loading="lazy"';
      }

      // Add async decoding for non-blocking image decode
      if (!/decoding\s*=/i.test(newAttrs)) {
        newAttrs += ' decoding="async"';
      }

      return `<img ${newAttrs}>`;
    }),
  );

  // Rebuild HTML string, replacing each match at its original position
  let result = '';
  let lastIndex = 0;
  for (let i = 0; i < matches.length; i++) {
    result += htmlContent.slice(lastIndex, matches[i].index);
    result += processedTags[i];
    lastIndex = matches[i].index + matches[i][0].length;
  }
  result += htmlContent.slice(lastIndex);

  return result;
}
