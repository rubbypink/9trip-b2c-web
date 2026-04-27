/**
 * Firebase Storage image URL utility.
 * Hiện tại Firebase Storage chưa được sử dụng — tất cả ảnh lưu dạng URL trong Firestore.
 * File này giữ làm placeholder cho tương lai khi cần migrate ảnh lên Storage.
 */

/**
 * Resolve a Firebase Storage image path to a downloadable HTTPS URL.
 * Hiện chỉ pass-through HTTP URL, không gọi Storage (bucket trống).
 *
 * @param {string|null|undefined} imagePath - The image path or URL
 * @returns {string|null} Original URL or null
 */
export function getStorageImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return null;
  // Pass-through: ảnh đang lưu dạng URL trong Firestore, không cần resolve
  return imagePath;
}

/**
 * Placeholder — hiện không cần resolve vì Storage chưa có dữ liệu.
 * Giữ nguyên document, không thay đổi gì.
 *
 * @param {Object} doc - Firestore document (already serialized)
 * @returns {Object} Unmodified document
 */
export function resolveDocImages(doc) {
  return doc;
}

/**
 * Placeholder — hiện không cần resolve.
 *
 * @param {Object[]} docs - Array of Firestore documents
 * @returns {Object[]} Unmodified array
 */
export function resolveDocsImages(docs) {
  return docs;
}

/**
 * Synchronous helper to determine if a string is a valid image URL.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/");
}
