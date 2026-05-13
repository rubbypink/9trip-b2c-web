/**
 * Firebase Storage path builders — pure string functions.
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
 *   images/logo.png, favicon.webp...
 *     banners/hero-banner.webp,footer-banner.webp, ...
 */

// ─── Root Folders ────────────────────────────────────────────────────

/**
 * Standard service types mapped to their Storage root folders.
 */
export const STORAGE_ROOTS = { tour: 'tours', hotel: 'hotels', activity: 'activities', car: 'cars', rental: 'rentals', avatar: 'avatars', picture: 'pictures', video: 'videos', image: 'images' };

// ─── Service Path Builders ───────────────────────────────────────────

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
	const pad = String(index + 1).padStart(2, '0');
	return `${getStorageBasePath(serviceType, serviceId)}/gallery/${pad}.webp`;
}

// ─── Room Image Path Builders ────────────────────────────────────────

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
	const pad = String(index + 1).padStart(2, '0');
	return `${getRoomStorageBasePath(serviceType, serviceId, roomId)}/gallery/${pad}.webp`;
}
