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
 *     rooms/{roomId}/
 *       featured.webp
 *       gallery/01.webp, 02.webp, ...
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
import { logger } from "./logger";

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

// ─── Room Image Path Builders ─────────────────────────────────────────

/**
 * Build the base Storage path for a room within a service.
 * @param {string} serviceType - "hotel" (rooms only apply to hotels)
 * @param {string} serviceId - Firestore document ID of the hotel
 * @param {string} roomId - Room ID e.g. "room_deluxe-ocean-view"
 * @returns {string} e.g. "hotels/abc123/rooms/room_deluxe-ocean-view"
 */
export function getRoomStorageBasePath(serviceType, serviceId, roomId) {
  return `${getStorageBasePath(serviceType, serviceId)}/rooms/${roomId}`;
}

/**
 * Build path for a room's featured image.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {string} roomId
 * @returns {string} e.g. "hotels/abc123/rooms/room_deluxe-ocean-view/featured.webp"
 */
export function getRoomFeaturedImagePath(serviceType, serviceId, roomId) {
  return `${getRoomStorageBasePath(serviceType, serviceId, roomId)}/featured.webp`;
}

/**
 * Build path for a room's gallery image.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {string} roomId
 * @param {number} index - 0-based index
 * @returns {string} e.g. "hotels/abc123/rooms/room_deluxe-ocean-view/gallery/01.webp"
 */
export function getRoomGalleryImagePath(serviceType, serviceId, roomId, index) {
  const pad = String(index + 1).padStart(2, "0");
  return `${getRoomStorageBasePath(serviceType, serviceId, roomId)}/gallery/${pad}.webp`;
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

// ─── Room Image Upload ────────────────────────────────────────────────

/**
 * Upload a room's featured image to Storage.
 * @param {string} serviceType - "hotel"
 * @param {string} serviceId - Hotel Firestore document ID
 * @param {string} roomId - Room ID
 * @param {File|Blob|Uint8Array|ArrayBuffer} file
 * @returns {Promise<string>} Download URL
 */
export async function uploadRoomFeaturedImage(serviceType, serviceId, roomId, file) {
  const path = getRoomFeaturedImagePath(serviceType, serviceId, roomId);
  return uploadImage(path, file);
}

/**
 * Upload a room's gallery image at a specific index.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {string} roomId
 * @param {number} index
 * @param {File|Blob|Uint8Array|ArrayBuffer} file
 * @returns {Promise<string>} Download URL
 */
export async function uploadRoomGalleryImage(serviceType, serviceId, roomId, index, file) {
  const path = getRoomGalleryImagePath(serviceType, serviceId, roomId, index);
  return uploadImage(path, file);
}

/**
 * Upload all gallery images for a room (batch).
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {string} roomId
 * @param {Array<File|Blob|Uint8Array|ArrayBuffer>} files
 * @returns {Promise<string[]>} Array of download URLs
 */
export async function uploadRoomGalleryImages(serviceType, serviceId, roomId, files) {
  return Promise.all(
    files.map((file, idx) => uploadRoomGalleryImage(serviceType, serviceId, roomId, idx, file))
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
      logger.error(
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
    logger.error(
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
    logger.error("[getGalleryImageUrls] Error:", error.message);
    return [];
  }
}

// ─── Document Image Resolution ────────────────────────────────────────

/**
 * Resolve all image fields in a Firestore document to full HTTPS download URLs.
 * Handles common image field names: featuredImage, gallery, images, media, logo.
 * Also recursively resolves room images for hotel documents (rooms embedded Map/array).
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

  // Recursively resolve room images for hotel documents
  // rooms can be an embedded Map (object with roomId keys) or an Array
  if (result.rooms) {
    if (Array.isArray(result.rooms)) {
      // Embedded array of room objects
      result.rooms = await Promise.all(
        result.rooms.map((room) => resolveDocImages(room))
      );
    } else if (typeof result.rooms === "object") {
      // Embedded Map (key = roomId)
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
    logger.error("[deleteImage] Error:", path, error.message);
  }
}

/**
 * Delete all images for a room (featured + entire gallery folder).
 * @param {string} serviceType - "hotel"
 * @param {string} serviceId - Hotel Firestore document ID
 * @param {string} roomId - Room ID
 */
export async function deleteRoomImages(serviceType, serviceId, roomId) {
  const roomBase = getRoomStorageBasePath(serviceType, serviceId, roomId);

  // Delete room featured
  await deleteImage(`${roomBase}/featured.webp`);

  // Delete all room gallery images
  try {
    const galleryRef = ref(storage, `${roomBase}/gallery`);
    const result = await listAll(galleryRef);
    await Promise.all(result.items.map((itemRef) => deleteObject(itemRef)));
  } catch (error) {
    logger.error("[deleteRoomImages] Error listing gallery:", error.message);
  }
}

/**
 * Delete all images for a service (featured + entire gallery + room images for hotels).
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
    logger.error("[deleteServiceImages] Error listing gallery:", error.message);
  }

  // For hotels: also delete all room images
  if (serviceType === "hotel") {
    try {
      const roomsRef = ref(storage, `${base}/rooms`);
      const roomsResult = await listAll(roomsRef);
      // Each sub-folder under rooms/ is a roomId
      for (const roomFolder of roomsResult.prefixes) {
        const roomId = roomFolder.name; // e.g. "room_deluxe-ocean-view"
        await deleteRoomImages(serviceType, serviceId, roomId);
      }
    } catch (error) {
      // rooms folder might not exist yet — not an error
      if (error.code !== "storage/object-not-found" && error.code !== "storage/404") {
        logger.error("[deleteServiceImages] Error cleaning room images:", error.message);
      }
    }
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

