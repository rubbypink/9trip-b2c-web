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
