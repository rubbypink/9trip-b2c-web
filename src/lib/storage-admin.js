/**
 * Firebase Admin Storage utility — resolve image URLs on the server side.
 *
 * Uses Admin SDK to generate signed URLs for Firebase Storage files.
 * Intended for Server Components and API routes only.
 *
 * @see storage.js for Client SDK version (upload/download in browser)
 */

import { getApps, getApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import './firebase-admin';

let _bucket = null;
function getBucket() {
  if (!_bucket) {
    // Ensure Firebase Admin is initialized before accessing storage
    if (!getApps().some(app => app.name === '9trip-admin')) {
      throw new Error(
        'Firebase Admin not initialized. Storage operations require Firebase Admin credentials.',
      );
    }
    const bucketName = process.env.APP_FIREBASE_STORAGE_BUCKET
      || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      || `${process.env.APP_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;

    try {
      const app = getApp('9trip-admin');
      const storage = getStorage(app);
      _bucket = storage.bucket(bucketName);
    } catch (error) {
      console.error('[storage-admin] Failed to initialize storage bucket:', error);
      throw new Error(`Failed to initialize storage bucket: ${error.message}`);
    }
  }
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
    if (!doc[field]) continue;

    if (typeof doc[field] === "string") {
      result[field] = await getStorageImageUrl(doc[field]);
    } else if (Array.isArray(doc[field])) {
      result[field] = await Promise.all(
        doc[field].map((img) =>
          typeof img === "string" ? getStorageImageUrl(img) : resolveDocImages(img)
        )
      );
    } else if (typeof doc[field] === "object") {
      result[field] = await resolveDocImages(doc[field]);
    }
  }

  return result;
}

/**
 * Resolve images for an array of documents.
 * @param {Array<Object>} docs
 * @returns {Promise<Array<Object>>}
 */
export async function resolveDocsImages(docs) {
  if (!Array.isArray(docs)) return docs;
  return Promise.all(docs.map((doc) => resolveDocImages(doc)));
}

/**
 * Batch-resolve image URLs for an array of objects (e.g., hotels, tours, activities).
 * Identical logic to storage.js:resolveImageBatch but uses Admin Storage SDK.
 *
 * @param {Array<Object>} items
 * @param {string} field
 * @returns {Promise<Array<Object>>}
 */
export async function resolveImageBatch(items, field = "featuredImage") {
  if (!Array.isArray(items)) return items;

  return Promise.all(
    items.map(async (item) => ({
      ...item,
      [field]: await getStorageImageUrl(item[field]),
    }))
  );
}
