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
