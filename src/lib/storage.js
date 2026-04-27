/**
 * Firebase Storage image URL utility.
 * Converts gs:// paths to download URLs, handles various Firebase Storage URL formats.
 */
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Resolve a Firebase Storage image path to a downloadable HTTPS URL.
 * Handles: full HTTP URLs, gs:// paths, and relative storage paths.
 *
 * @param {string|null|undefined} imagePath - The image path or URL
 * @returns {Promise<string|null>} Downloadable HTTPS URL or null
 */
export async function getStorageImageUrl(imagePath) {
  if (!imagePath) return null;

  // Already a full HTTP/HTTPS URL — return as-is
  if (typeof imagePath === "string" && (imagePath.startsWith("http://") || imagePath.startsWith("https://"))) {
    return imagePath;
  }

  // gs:// bucket path
  if (typeof imagePath === "string" && imagePath.startsWith("gs://")) {
    try {
      const storageRef = ref(storage, imagePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("[getStorageImageUrl] Failed to resolve gs:// URL:", imagePath, error.message);
      return null;
    }
  }

  // Relative path (e.g., "tours/featured.jpg")
  try {
    const storageRef = ref(storage, imagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("[getStorageImageUrl] Failed to resolve relative path:", imagePath, error.message);
    return null;
  }
}

/**
 * Resolve all image fields in a document to full HTTPS download URLs.
 * Handles common image field names: featuredImage, gallery, images, media, logo.
 * Works recursively for arrays and nested objects.
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
        // Resolve each image in an array
        const resolved = await Promise.all(
          result[field].map((url) => getStorageImageUrl(url))
        );
        result[field] = resolved.filter(Boolean);
      } else if (typeof result[field] === "string") {
        // Resolve single image URL
        const resolved = await getStorageImageUrl(result[field]);
        result[field] = resolved || result[field];
      }
    }
  }

  return result;
}

/**
 * Resolve images for multiple documents in parallel.
 *
 * @param {Object[]} docs - Array of Firestore documents
 * @returns {Promise<Object[]>} Documents with resolved image URLs
 */
export async function resolveDocsImages(docs) {
  if (!Array.isArray(docs)) return docs;
  return Promise.all(docs.map((doc) => resolveDocImages(doc)));
}

/**
 * Synchronous helper to determine if a string is a valid image URL.
 * Use this for initial rendering; use getStorageImageUrl for gs:// paths.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("gs://") || url.startsWith("/");
}
