/**
 * Firebase Storage utility — upload, download, directory structure, WebP optimization.
 *
 * Directory structure on Storage (NOT Firestore collections):
 *   tours/{tourId}/
 *     featured.webp
 *     gallery/01.webp, 02.webp, ...
 *   hotels/{hotelId}/
 *     featured.webp
 *     gallery/01.webp, 02.webp, ...
 *   activities/{activityId}/
 *     featured.webp
 *     gallery/01.webp, 02.webp, ...
 *   cars/{carId}/
 *     featured.webp
 *     gallery/01.webp, 02.webp, ...
 *   rentals/{rentalId}/
 *     featured.webp
 *     gallery/01.webp, 02.webp, ...
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "./firebase";

// ─── Path Builders ────────────────────────────────────────────────────

/**
 * Standard service types mapped to their Storage root folders.
 */
const STORAGE_ROOTS = {
  tour: "tours",
  hotel: "hotels",
  activity: "activities",
  car: "cars",
  rental: "rentals",
};

/**
 * Build the base Storage path for a service item.
 * @param {string} serviceType - "tour" | "hotel" | "activity" | "car" | "rental"
 * @param {string} serviceId - Firestore document ID
 * @returns {string} e.g. "tours/abc123"
 */
export function getStorageBasePath(serviceType, serviceId) {
  const root = STORAGE_ROOTS[serviceType] || serviceType;
  return `${root}/${serviceId}`;
}

/**
 * Build path for the featured/main image of a service.
 * @param {string} serviceType
 * @param {string} serviceId
 * @returns {string} e.g. "tours/abc123/featured.webp"
 */
export function getFeaturedImagePath(serviceType, serviceId) {
  return `${getStorageBasePath(serviceType, serviceId)}/featured.webp`;
}

/**
 * Build path for a gallery image.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {number} index - 0-based index
 * @returns {string} e.g. "tours/abc123/gallery/01.webp"
 */
export function getGalleryImagePath(serviceType, serviceId, index) {
  const pad = String(index + 1).padStart(2, "0");
  return `${getStorageBasePath(serviceType, serviceId)}/gallery/${pad}.webp`;
}

// ─── Upload ───────────────────────────────────────────────────────────

/**
 * Upload a File/Blob to Firebase Storage.
 * Automatically sets contentType to "image/webp".
 *
 * @param {string} path - Full storage path e.g. "tours/abc123/featured.webp"
 * @param {File|Blob|Uint8Array|ArrayBuffer} file - File data
 * @returns {Promise<string>} Download URL
 */
export async function uploadImage(path, file) {
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
  };
  const snapshot = await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(snapshot.ref);
}

/**
 * Upload featured image for a service.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {File|Blob|Uint8Array|ArrayBuffer} file
 * @returns {Promise<string>} Download URL
 */
export async function uploadFeaturedImage(serviceType, serviceId, file) {
  const path = getFeaturedImagePath(serviceType, serviceId);
  return uploadImage(path, file);
}

/**
 * Upload a gallery image for a service at a specific index.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {number} index
 * @param {File|Blob|Uint8Array|ArrayBuffer} file
 * @returns {Promise<string>} Download URL
 */
export async function uploadGalleryImage(serviceType, serviceId, index, file) {
  const path = getGalleryImagePath(serviceType, serviceId, index);
  return uploadImage(path, file);
}

/**
 * Upload all gallery images for a service (batch).
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {Array<File|Blob|Uint8Array|ArrayBuffer>} files
 * @returns {Promise<string[]>} Array of download URLs
 */
export async function uploadGalleryImages(serviceType, serviceId, files) {
  return Promise.all(
    files.map((file, idx) => uploadGalleryImage(serviceType, serviceId, idx, file))
  );
}

// ─── Download / Resolve ───────────────────────────────────────────────

/**
 * Resolve a Firebase Storage path to a downloadable HTTPS URL.
 * Handles: full HTTP URLs (pass-through), gs:// paths, relative Storage paths.
 *
 * @param {string|null|undefined} imagePath - The image path or URL
 * @returns {Promise<string|null>} Downloadable HTTPS URL or null
 */
export async function getStorageImageUrl(imagePath) {
  if (!imagePath) return null;

  // Already a full HTTP/HTTPS URL — return as-is (externally hosted)
  if (
    typeof imagePath === "string" &&
    (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
  ) {
    return imagePath;
  }

  // gs:// bucket path
  if (typeof imagePath === "string" && imagePath.startsWith("gs://")) {
    try {
      const storageRef = ref(storage, imagePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error(
        "[getStorageImageUrl] Failed to resolve gs:// path:",
        imagePath,
        error.message
      );
      return null;
    }
  }

  // Relative path within the default bucket (e.g. "tours/abc123/featured.webp")
  try {
    const storageRef = ref(storage, imagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error(
      "[getStorageImageUrl] Failed to resolve relative path:",
      imagePath,
      error.message
    );
    return null;
  }
}

/**
 * Get the download URL for a service's featured image by its known path.
 * @param {string} serviceType
 * @param {string} serviceId
 * @returns {Promise<string|null>}
 */
export async function getFeaturedImageUrl(serviceType, serviceId) {
  const path = getFeaturedImagePath(serviceType, serviceId);
  return getStorageImageUrl(path);
}

/**
 * Get download URLs for a service's gallery images.
 * Lists all files under the gallery folder.
 * @param {string} serviceType
 * @param {string} serviceId
 * @returns {Promise<string[]>}
 */
export async function getGalleryImageUrls(serviceType, serviceId) {
  try {
    const galleryPath = `${getStorageBasePath(serviceType, serviceId)}/gallery`;
    const listRef = ref(storage, galleryPath);
    const result = await listAll(listRef);
    const urls = await Promise.all(
      result.items.map((itemRef) => getDownloadURL(itemRef))
    );
    return urls;
  } catch (error) {
    console.error("[getGalleryImageUrls] Error:", error.message);
    return [];
  }
}

// ─── Document Image Resolution ────────────────────────────────────────

/**
 * Resolve all image fields in a Firestore document to full HTTPS download URLs.
 * Handles common image field names: featuredImage, gallery, images, media, logo.
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

// ─── Delete ───────────────────────────────────────────────────────────

/**
 * Delete an image from Storage by its full path.
 * @param {string} path - Storage path e.g. "tours/abc123/featured.webp"
 */
export async function deleteImage(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("[deleteImage] Error:", path, error.message);
  }
}

/**
 * Delete all images for a service (featured + entire gallery folder).
 * @param {string} serviceType
 * @param {string} serviceId
 */
export async function deleteServiceImages(serviceType, serviceId) {
  const base = getStorageBasePath(serviceType, serviceId);

  // Delete featured
  await deleteImage(`${base}/featured.webp`);

  // Delete all gallery images
  try {
    const galleryRef = ref(storage, `${base}/gallery`);
    const result = await listAll(galleryRef);
    await Promise.all(result.items.map((itemRef) => deleteObject(itemRef)));
  } catch (error) {
    console.error("[deleteServiceImages] Error listing gallery:", error.message);
  }
}

// ─── URL Validation ───────────────────────────────────────────────────

/**
 * Check if a string looks like a valid image URL or Storage path.
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("gs://") ||
    url.startsWith("/")
  );
}

/**
 * Generate a slug-safe filename from a string (for reference/naming).
 * @param {string} name - Original name
 * @returns {string} Slug-safe name (lowercase, alphanumeric + hyphens, max 80 chars)
 */
export function slugifyFileName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

