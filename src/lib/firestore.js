import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, startAfter, addDoc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { cache } from 'react';
import { db } from './firebase';

// ─── Collection References ────────────────────────────────────────────

const toursCol = collection(db, 'tours');
const hotelsCol = collection(db, 'hotels');
const roomsCol = collection(db, 'rooms');
const activitiesCol = collection(db, 'activities');
const carsCol = collection(db, 'cars');
const locationsCol = collection(db, 'locations');
const bookingsCol = collection(db, 'bookings');
const reviewsCol = collection(db, 'reviews');
const usersCol = collection(db, 'users');
const couponsCol = collection(db, 'coupons');
const notificationsCol = collection(db, 'notifications');

// ─── Generic Helpers ──────────────────────────────────────────────────

/**
 * Convert Firestore special types to plain serializable objects.
 * Handles: Timestamp → ISO string, DocumentReference → { _ref: path },
 * GeoPoint → { lat, lng }, Bytes → base64.
 * Deep-walks objects/arrays recursively.
 * @param {*} value - Any value potentially containing Firestore types
 * @returns {*} Plain serializable value
 */
function serializeTimestamp(value) {
	if (value === null || value === undefined) return value;

	// Firestore Timestamp
	if (value && typeof value.toDate === 'function' && typeof value.seconds === 'number') {
		return value.toDate().toISOString();
	}

	// Firestore DocumentReference
	if (value && typeof value.path === 'string' && typeof value.id === 'string' && typeof value.parent === 'object') {
		return { _ref: value.path };
	}

	// Firestore GeoPoint
	if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number' && typeof value.isEqual === 'function') {
		return { lat: value.latitude, lng: value.longitude };
	}

	// Firestore Bytes (Uint8Array)
	if (value instanceof Uint8Array) {
		// Convert to base64
		let binary = '';
		for (let i = 0; i < value.length; i++) {
			binary += String.fromCharCode(value[i]);
		}
		return btoa(binary);
	}

	// Firestore FieldValue sentinel — ignore
	if (value && typeof value.isEqual === 'function' && typeof value._methodName === 'string') {
		return undefined;
	}

	if (Array.isArray(value)) return value.map(serializeTimestamp);

	if (typeof value === 'object' && value.constructor === Object) {
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			const serialized = serializeTimestamp(v);
			// Skip undefined values (from FieldValue sentinels)
			if (serialized !== undefined) {
				out[k] = serialized;
			}
		}
		return out;
	}
	return value;
}

/**
 * Serialize a Firestore document snapshot to a plain object safe for Client Components.
 * @param {import("firebase/firestore").DocumentSnapshot} snap
 * @returns {Object}
 */
function serializeDoc(snap) {
	return serializeTimestamp({ id: snap.id, ...snap.data() });
}

/**
 * Fetch a single document by ID from a collection.
 * @param {string} colName - Firestore collection name
 * @param {string} id - Document ID
 * @returns {Promise<Object|null>} Document data with id, or null
 */
export async function getDocById(colName, id) {
	const snap = await getDoc(doc(db, colName, id));
	return snap.exists() ? serializeDoc(snap) : null;
}

/**
 * Fetch a single document by slug from a collection.
 * @param {string} colName - Firestore collection name
 * @param {string} slug - URL slug
 * @returns {Promise<Object|null>}
 */
export async function getDocBySlug(colName, slug) {
	const q = query(collection(db, colName), where('slug', '==', slug), limit(1));
	const snap = await getDocs(q);
	if (snap.empty) return null;
	return serializeDoc(snap.docs[0]);
}

/**
 * Create a document in a collection.
 * @param {string} colName - Firestore collection name
 * @param {Object} data - Document data
 * @returns {Promise<string>} New document ID
 */
export async function createDoc(colName, data) {
	const ref = await addDoc(collection(db, colName), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
	return ref.id;
}

/**
 * Update a document by ID.
 * @param {string} colName - Firestore collection name
 * @param {string} id - Document ID
 * @param {Object} data - Fields to update
 */
export async function updateDocById(colName, id, data) {
	await updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
}

/**
 * Delete a document by ID.
 * @param {string} colName
 * @param {string} id
 */
export async function deleteDocById(colName, id) {
	await deleteDoc(doc(db, colName, id));
}

// ─── Tours ────────────────────────────────────────────────────────────

/**
 * Fetch all tours, ordered by creation date (newest first), paginated.
 * @param {{ pageSize?: number, cursor?: import("firebase/firestore").DocumentSnapshot }} options
 * @returns {Promise<{tours: Object[], lastVisible: import("firebase/firestore").DocumentSnapshot|null}>}
 */
export async function getTours({ pageSize = 12, cursor = null } = {}) {
	let q = query(toursCol, orderBy('createdAt', 'desc'), limit(pageSize));
	if (cursor) q = query(toursCol, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize));
	const snap = await getDocs(q);
	const tours = snap.docs.map((d) => serializeDoc(d));
	return { tours, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Fetch featured tours.
 * @param {number} count - Number of tours to fetch
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedTours(count = 8) {
	const q = query(toursCol, where('isFeatured', '==', true), orderBy('createdAt', 'desc'), limit(count));
	const snap = await getDocs(q);
	return snap.docs.map((d) => serializeDoc(d));
}

/**
 * Search tours with filters.
 * @param {Object} filters
 * @param {string} [filters.locationId]
 * @param {string} [filters.tourTypeId]
 * @param {number} [filters.minPrice]
 * @param {number} [filters.maxPrice]
 * @param {number} [filters.minRating]
 * @param {string} [filters.sortBy] - 'price_asc' | 'price_desc' | 'rating' | 'newest'
 * @param {number} [filters.pageSize]
 * @param {*} [filters.cursor]
 * @returns {Promise<{tours: Object[], lastVisible: *}>}
 */
export async function searchTours(filters = {}) {
	const { locationId, tourTypeId, minPrice, maxPrice, minRating, sortBy = 'newest', pageSize = 12, cursor } = filters;

	try {
		const constraints = [];

		if (locationId) constraints.push(where('locationId', '==', locationId));
		if (tourTypeId) constraints.push(where('tourTypeId', '==', tourTypeId));
		if (minRating) constraints.push(where('ratingAverage', '>=', minRating));

		switch (sortBy) {
			case 'price_asc':
				constraints.push(orderBy('pricing.adultPrice', 'asc'));
				break;
			case 'price_desc':
				constraints.push(orderBy('pricing.adultPrice', 'desc'));
				break;
			case 'rating':
				constraints.push(orderBy('ratingAverage', 'desc'));
				break;
			case 'newest':
			default:
				constraints.push(orderBy('createdAt', 'desc'));
		}

		constraints.push(limit(pageSize));
		if (cursor) constraints.push(startAfter(cursor));

		const q = query(toursCol, ...constraints);
		const snap = await getDocs(q);

		let tours = snap.docs.map((d) => serializeDoc(d));

		// Client-side price filtering (Firestore can't compound range queries across different fields)
		if (minPrice != null && minPrice !== '') tours = tours.filter((t) => t.pricing?.adultPrice >= minPrice);
		if (maxPrice != null && maxPrice !== '') tours = tours.filter((t) => t.pricing?.adultPrice <= maxPrice);

		return { tours, lastVisible: snap.docs[snap.docs.length - 1] || null };
	} catch (error) {
		console.error('[searchTours] Error:', error.message);
		// Fallback: try simpler query without filters
		try {
			const q = query(toursCol, orderBy('createdAt', 'desc'), limit(pageSize));
			const snap = await getDocs(q);
			return { tours: snap.docs.map((d) => serializeDoc(d)), lastVisible: snap.docs[snap.docs.length - 1] || null };
		} catch {
			return { tours: [], lastVisible: null };
		}
	}
}

/**
 * Fetch related tours (same location, excluding current), looked up by slug.
 * @param {string} slug - Current tour slug
 * @param {number} [count=4]
 * @returns {Promise<{tours: Object[]}>}
 */
export async function getRelatedTours(slug, count = 4) {
	const tour = await getDocBySlug('tours', slug);
	if (!tour) return { tours: [] };

	const q = query(toursCol, where('locationId', '==', tour.locationId), orderBy('createdAt', 'desc'), limit(count * 2));
	const snap = await getDocs(q);
	const tours = snap.docs
		.map((d) => serializeDoc(d))
		.filter((t) => t.id !== tour.id)
		.slice(0, count);
	return { tours };
}

/**
 * Fetch a single tour by slug.
 * @param {string} slug
 * @returns {Promise<{tour: Object|null}>}
 */
export async function getTourBySlug(slug) {
	const tour = await getDocBySlug('tours', slug);
	return { tour };
}

/**
 * Fetch pricing tiers for a specific tour (subcollection: tours/{tourId}/tourPricing).
 * Sorted by sortOrder ascending.
 * @param {string} tourId
 * @returns {Promise<Object[]>}
 */
export async function getTourPricing(tourId) {
	try {
		const pricingCol = collection(db, 'tours', tourId, 'tourPricing');
		const q = query(pricingCol, where('isActive', '==', true), orderBy('sortOrder', 'asc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getTourPricing] Error:', error.message);
		return [];
	}
}

/**
 * Fetch reviews for a tour, looked up by slug.
 * @param {string} slug - Tour slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getTourReviews(slug) {
	const tour = await getDocBySlug('tours', slug);
	if (!tour) return { reviews: [], totalRating: 0, avgRating: 0 };

	const { reviews } = await getReviews('tour', tour.id);
	const totalRating = reviews.length;
	const avgRating = totalRating > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating : 0;

	return { reviews, totalRating, avgRating };
}

// ─── Hotels ───────────────────────────────────────────────────────────

/**
 * Fetch hotels with pagination.
 * @returns {Promise<{hotels: Object[], lastVisible: *}>}
 */
export async function getHotels({ pageSize = 12, cursor = null } = {}) {
	let q = query(hotelsCol, orderBy('createdAt', 'desc'), limit(pageSize));
	if (cursor) q = query(hotelsCol, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize));
	const snap = await getDocs(q);
	const hotels = snap.docs.map((d) => serializeDoc(d));
	return { hotels, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Search hotels with filters.
 * @param {Object} filters
 */
export async function searchHotels(filters = {}) {
	const { locationId, starRating, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, cursor } = filters;

	try {
		const constraints = [];
		if (locationId) constraints.push(where('address.cityId', '==', locationId));
		if (starRating) constraints.push(where('starRating', '>=', Number(starRating)));

		switch (sortBy) {
			case 'price_asc':
				constraints.push(orderBy('pricing.basePrice', 'asc'));
				break;
			case 'price_desc':
				constraints.push(orderBy('pricing.basePrice', 'desc'));
				break;
			case 'rating':
				constraints.push(orderBy('rating', 'desc'));
				break;
			default:
				constraints.push(orderBy('createdAt', 'desc'));
		}

		constraints.push(limit(pageSize));
		if (cursor) constraints.push(startAfter(cursor));

		const q = query(hotelsCol, ...constraints);
		const snap = await getDocs(q);
		let hotels = snap.docs.map((d) => serializeDoc(d));

		if (minPrice != null && minPrice !== '') hotels = hotels.filter((h) => h.pricing?.basePrice >= minPrice);
		if (maxPrice != null && maxPrice !== '') hotels = hotels.filter((h) => h.pricing?.basePrice <= maxPrice);

		return { hotels, lastVisible: snap.docs[snap.docs.length - 1] || null };
	} catch (error) {
		console.error('[searchHotels] Error:', error.message);
		try {
			const q = query(hotelsCol, orderBy('createdAt', 'desc'), limit(pageSize));
			const snap = await getDocs(q);
			return { hotels: snap.docs.map((d) => serializeDoc(d)), lastVisible: snap.docs[snap.docs.length - 1] || null };
		} catch {
			return { hotels: [], lastVisible: null };
		}
	}
}

/**
 * Fetch featured hotels.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedHotels(count = 6) {
	const q = query(hotelsCol, where('isFeatured', '==', true), orderBy('createdAt', 'desc'), limit(count));
	const snap = await getDocs(q);
	return snap.docs.map((d) => serializeDoc(d));
}

/**
 * Fetch rooms for a specific hotel.
 * Sorts by price client-side to avoid composite index requirement.
 * @param {string} hotelId
 * @returns {Promise<Object[]>}
 */
export async function getRoomsByHotel(hotelId) {
  try {
    const q = query(roomsCol, where('hotelId', '==', hotelId));
    const snap = await getDocs(q);
    const rooms = snap.docs.map((d) => serializeDoc(d));
    // Sort client-side by price ascending (avoids composite index)
    rooms.sort((a, b) => (a.price || 0) - (b.price || 0));
    return rooms;
  } catch (error) {
    console.error('[getRoomsByHotel] Error:', error.message);
    return [];
  }
}

/**
 * Fetch a single hotel by slug.
 * @param {string} slug
 * @returns {Promise<{hotel: Object|null}>}
 */
export async function getHotelBySlug(slug) {
	const q = query(hotelsCol, where('slug', '==', slug), limit(1));
	const snap = await getDocs(q);
	if (snap.empty) return { hotel: null };
	return { hotel: serializeDoc(snap.docs[0]) };
}

/**
 * Fetch related hotels by location.
 * Note: Firestore does not support '!=' in queries, so we fetch extra
 * and filter out the current hotel on the client side.
 * @param {string} currentSlug - slug của hotel hiện tại để loại trừ
 * @param {string} locationId - ID của địa điểm
 * @param {number} count
 * @returns {Promise<{hotels: Object[]}>}
 */
export async function getRelatedHotels(currentSlug, locationId, count = 3) {
	if (!locationId) return { hotels: [] };
	const q = query(
		hotelsCol,
		where('address.cityId', '==', locationId),
		orderBy('rating', 'desc'),
		limit(count + 1)
	);
	const snap = await getDocs(q);
	const hotels = snap.docs
		.map((d) => serializeDoc(d))
		.filter((h) => h.slug !== currentSlug)
		.slice(0, count);
	return { hotels };
}

/**
 * Fetch pricing tiers for a specific room (subcollection: rooms/{roomId}/roomPricing).
 * Sorted by sortOrder ascending. Tương tự getTourPricing pattern.
 * @param {string} roomId
 * @returns {Promise<Object[]>}
 */
export async function getRoomPricing(roomId) {
	try {
		const pricingCol = collection(db, 'rooms', roomId, 'roomPricing');
		const q = query(pricingCol, where('isActive', '==', true), orderBy('sortOrder', 'asc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getRoomPricing] Error:', error.message);
		return [];
	}
}

/**
 * Fetch tổng hợp pricing cho hotel: lấy tất cả rooms + pricing tiers.
 * Dùng cho view tổng hợp ở sidebar và room cards.
 * @param {string} hotelId
 * @returns {Promise<Object[]>} Array of rooms với pricingTiers embedded
 */
export async function getHotelPricing(hotelId) {
	try {
		// Lấy tất cả rooms
		const rooms = await getRoomsByHotel(hotelId);
		if (rooms.length === 0) return [];

		// Lấy pricing tiers cho mỗi room song song
		const roomsWithPricing = await Promise.all(
			rooms.map(async (room) => {
				const pricingTiers = await getRoomPricing(room.id);
				return { ...room, pricingTiers };
			})
		);
		return roomsWithPricing;
	} catch (error) {
		console.error('[getHotelPricing] Error:', error.message);
		return [];
	}
}

/**
 * Fetch reviews for a hotel, looked up by slug.
 * Tương tự getTourReviews pattern.
 * @param {string} slug - Hotel slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getHotelReviews(slug) {
	try {
		const hotel = await getDocBySlug('hotels', slug);
		if (!hotel) return { reviews: [], totalRating: 0, avgRating: 0 };

		const { reviews } = await getReviews('hotel', hotel.id);
		const totalRating = reviews.length;
		const avgRating = totalRating > 0
			? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating
			: hotel.rating?.average || 0;

		return { reviews, totalRating, avgRating };
	} catch (error) {
		console.error('[getHotelReviews] Error:', error.message);
		// Fallback: dùng rating từ hotel document
		const hotel = await getDocBySlug('hotels', slug);
		if (!hotel) return { reviews: [], totalRating: 0, avgRating: 0 };
		return {
			reviews: [],
			totalRating: hotel.rating?.count || 0,
			avgRating: hotel.rating?.average || 0,
		};
	}
}

// ─── Hotels v3: Room Types, Physical Rooms, Inventory ─────────────────

/**
 * Fetch room types for a hotel (subcollection: hotels/{hotelId}/roomTypes).
 * Sorted by sortOrder ascending.
 * Hotels v3 schema — thay thế rooms/ flat collection cho UI.
 * @param {string} hotelId
 * @returns {Promise<Object[]>}
 */
export async function getRoomTypesByHotel(hotelId) {
	try {
		const roomTypesCol = collection(db, 'hotels', hotelId, 'roomTypes');
		const q = query(roomTypesCol, where('isActive', '==', true), orderBy('sortOrder', 'asc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getRoomTypesByHotel] Error:', error.message);
		// Fallback: dùng rooms/ top-level collection
		return getRoomsByHotel(hotelId);
	}
}

/**
 * Fetch pricing tiers for a room type (subcollection: hotels/{hotelId}/roomTypes/{roomTypeId}/roomPricing).
 * Hotels v3 schema — path mới thay cho rooms/{roomId}/roomPricing.
 * @param {string} hotelId
 * @param {string} roomTypeId
 * @returns {Promise<Object[]>}
 */
export async function getRoomTypePricing(hotelId, roomTypeId) {
	try {
		const pricingCol = collection(db, 'hotels', hotelId, 'roomTypes', roomTypeId, 'roomPricing');
		const q = query(pricingCol, where('isActive', '==', true), orderBy('sortOrder', 'asc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getRoomTypePricing] Error:', error.message);
		// Fallback: dùng old path rooms/{roomId}/roomPricing
		const oldPricing = await getRoomPricing(roomTypeId);
		return oldPricing;
	}
}

/**
 * Fetch tổng hợp pricing cho hotel từ roomTypes subcollection.
 * Hotels v3 — thay thế getHotelPricing (dùng rooms flat).
 * @param {string} hotelId
 * @returns {Promise<Object[]>} Array of roomTypes với pricingTiers embedded
 */
export async function getHotelPricingV3(hotelId) {
	try {
		// Lấy tất cả room types
		const roomTypes = await getRoomTypesByHotel(hotelId);
		if (roomTypes.length === 0) return [];

		// Lấy pricing tiers cho mỗi room type song song
		const roomTypesWithPricing = await Promise.all(
			roomTypes.map(async (rt) => {
				const pricingTiers = await getRoomTypePricing(hotelId, rt.id);
				return { ...rt, pricingTiers };
			})
		);
		return roomTypesWithPricing;
	} catch (error) {
		console.error('[getHotelPricingV3] Error:', error.message);
		return [];
	}
}

/**
 * Fetch physical rooms for a hotel (subcollection: hotels/{hotelId}/rooms).
 * Dùng cho inventory tracking: mỗi document = 1 phòng vật lý.
 * @param {string} hotelId
 * @param {string} [roomTypeId] - Optional: filter by room type
 * @returns {Promise<Object[]>}
 */
export async function getPhysicalRooms(hotelId, roomTypeId = null) {
	try {
		const roomsSubCol = collection(db, 'hotels', hotelId, 'rooms');
		let q;
		if (roomTypeId) {
			q = query(roomsSubCol, where('roomTypeId', '==', roomTypeId), where('isActive', '==', true));
		} else {
			q = query(roomsSubCol, where('isActive', '==', true));
		}
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getPhysicalRooms] Error:', error.message);
		return [];
	}
}

/**
 * Fetch daily inventory for a hotel (subcollection: hotels/{hotelId}/inventory).
 * Mỗi document = 1 ngày, chứa map roomType → availability.
 * @param {string} hotelId
 * @param {string} [startDate] - YYYY-MM-DD, mặc định hôm nay
 * @param {number} [days] - Số ngày, mặc định 30
 * @returns {Promise<Object[]>}
 */
export async function getHotelInventory(hotelId, startDate = null, days = 30) {
	try {
		const today = startDate || new Date().toISOString().split('T')[0];
		const endDate = new Date(today);
		endDate.setDate(endDate.getDate() + days);
		const endStr = endDate.toISOString().split('T')[0];

		const inventoryCol = collection(db, 'hotels', hotelId, 'inventory');
		const q = query(
			inventoryCol,
			where('date', '>=', today),
			where('date', '<=', endStr),
			orderBy('date', 'asc')
		);
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getHotelInventory] Error:', error.message);
		return [];
	}
}

/**
 * Fetch inventory for a specific date.
 * @param {string} hotelId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object|null>}
 */
export async function getHotelInventoryByDate(hotelId, date) {
	try {
		const inventoryCol = collection(db, 'hotels', hotelId, 'inventory');
		const q = query(inventoryCol, where('date', '==', date), limit(1));
		const snap = await getDocs(q);
		if (snap.empty) return null;
		return serializeDoc(snap.docs[0]);
	} catch (error) {
		console.error('[getHotelInventoryByDate] Error:', error.message);
		return null;
	}
}

/**
 * Tính số phòng còn trống thực tế cho 1 hotel vào 1 ngày cụ thể.
 * Kết hợp: inventory subcollection + bookings + holds.
 * Hotels v3 — thay thế getRealAvailability cho hotel.
 * @param {string} hotelId
 * @param {string} date - YYYY-MM-DD
 * @param {string} roomTypeId - Loại phòng cần kiểm tra
 * @param {number} totalRooms - Tổng số phòng loại này
 * @returns {Promise<number>}
 */
export async function getHotelRoomAvailability(hotelId, date, roomTypeId, totalRooms) {
	try {
		// 1. Check inventory subcollection first
		const inventory = await getHotelInventoryByDate(hotelId, date);
		if (inventory && inventory.roomTypes?.[roomTypeId]?.available !== undefined) {
			return inventory.roomTypes[roomTypeId].available;
		}

		// 2. Calculate from bookings + holds
		const confirmedBookings = await getDocs(
			query(
				bookingsCol,
				where('serviceId', '==', hotelId),
				where('serviceType', '==', 'hotel'),
				where('startDate', '==', date),
				where('bookingStatus', '==', 'confirmed')
			)
		);
		const bookedCount = confirmedBookings.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

		const now = new Date();
		const activeHolds = await getDocs(
			query(
				collection(db, 'inventory_holds'),
				where('serviceId', '==', hotelId),
				where('startDate', '==', date),
				where('expiresAt', '>', now)
			)
		);
		const heldCount = activeHolds.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

		return Math.max(0, totalRooms - bookedCount - heldCount);
	} catch (error) {
		console.error('[getHotelRoomAvailability] Error:', error.message);
		return totalRooms;
	}
}

// ─── Activities ───────────────────────────────────────────────────────

/**
 * Fetch activities with pagination.
 * @returns {Promise<{activities: Object[], lastVisible: *}>}
 */
export async function getActivitiesList({ pageSize = 12, cursor = null } = {}) {
	let q = query(activitiesCol, orderBy('createdAt', 'desc'), limit(pageSize));
	if (cursor) q = query(activitiesCol, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize));
	const snap = await getDocs(q);
	const activities = snap.docs.map((d) => serializeDoc(d));
	return { activities, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Search activities with filters.
 */
export async function searchActivities(filters = {}) {
	const { locationId, categoryId, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, cursor } = filters;

	try {
		const constraints = [];
		if (locationId) constraints.push(where('locationId', '==', locationId));
		if (categoryId) constraints.push(where('categoryId', '==', categoryId));

		switch (sortBy) {
			case 'price_asc':
				constraints.push(orderBy('pricing.basePrice', 'asc'));
				break;
			case 'price_desc':
				constraints.push(orderBy('pricing.basePrice', 'desc'));
				break;
			default:
				constraints.push(orderBy('createdAt', 'desc'));
		}

		constraints.push(limit(pageSize));
		if (cursor) constraints.push(startAfter(cursor));

		const q = query(activitiesCol, ...constraints);
		const snap = await getDocs(q);
		let activities = snap.docs.map((d) => serializeDoc(d));

		if (minPrice != null && minPrice !== '') activities = activities.filter((a) => a.pricing?.basePrice >= minPrice);
		if (maxPrice != null && maxPrice !== '') activities = activities.filter((a) => a.pricing?.basePrice <= maxPrice);

		return { activities, lastVisible: snap.docs[snap.docs.length - 1] || null };
	} catch (error) {
		console.error('[searchActivities] Error:', error.message);
		try {
			const q = query(activitiesCol, orderBy('createdAt', 'desc'), limit(pageSize));
			const snap = await getDocs(q);
			return { activities: snap.docs.map((d) => serializeDoc(d)), lastVisible: snap.docs[snap.docs.length - 1] || null };
		} catch {
			return { activities: [], lastVisible: null };
		}
	}
}

/**
 * Fetch a single activity by slug.
 * @param {string} slug
 * @returns {Promise<{activity: Object|null}>}
 */
export async function getActivityBySlug(slug) {
	const activity = await getDocBySlug('activities', slug);
	return { activity };
}

/**
 * Fetch pricing tiers for a specific activity.
 * Subcollection: activities/{activityId}/activityPricing/{priceId}
 * Sorted by sortOrder ascending.
 * @param {string} activityId
 * @returns {Promise<Object[]>}
 */
export async function getActivityPricing(activityId) {
	try {
		const pricingCol = collection(db, 'activities', activityId, 'activityPricing');
		const q = query(pricingCol, where('isActive', '==', true), orderBy('sortOrder', 'asc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		console.error('[getActivityPricing] Error:', error.message);
		return [];
	}
}

/**
 * Fetch related activities (same location, excluding current).
 * @param {string} slug - Current activity slug
 * @param {number} [count=4]
 * @returns {Promise<{activities: Object[]}>}
 */
export async function getRelatedActivities(slug, count = 4) {
	const activity = await getDocBySlug('activities', slug);
	if (!activity) return { activities: [] };

	const q = query(activitiesCol, where('locationId', '==', activity.locationId), orderBy('createdAt', 'desc'), limit(count * 2));
	const snap = await getDocs(q);
	const activities = snap.docs
		.map((d) => serializeDoc(d))
		.filter((a) => a.id !== activity.id)
		.slice(0, count);
	return { activities };
}

// ─── Cars ─────────────────────────────────────────────────────────────

/**
 * Search cars with filters.
 */
export async function searchCars(filters = {}) {
	const { carType, transmission, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, cursor } = filters;

	try {
		const constraints = [];
		if (carType) constraints.push(where('carType', '==', carType));
		if (transmission) constraints.push(where('transmission', '==', transmission));

		switch (sortBy) {
			case 'price_asc':
				constraints.push(orderBy('pricing.basePrice', 'asc'));
				break;
			case 'price_desc':
				constraints.push(orderBy('pricing.basePrice', 'desc'));
				break;
			default:
				constraints.push(orderBy('createdAt', 'desc'));
		}

		constraints.push(limit(pageSize));
		if (cursor) constraints.push(startAfter(cursor));

		const q = query(carsCol, ...constraints);
		const snap = await getDocs(q);
		let cars = snap.docs.map((d) => serializeDoc(d));

		if (minPrice != null && minPrice !== '') cars = cars.filter((c) => c.pricing?.basePrice >= minPrice);
		if (maxPrice != null && maxPrice !== '') cars = cars.filter((c) => c.pricing?.basePrice <= maxPrice);

		return { cars, lastVisible: snap.docs[snap.docs.length - 1] || null };
	} catch (error) {
		console.error('[searchCars] Error:', error.message);
		try {
			const q = query(carsCol, orderBy('createdAt', 'desc'), limit(pageSize));
			const snap = await getDocs(q);
			return { cars: snap.docs.map((d) => serializeDoc(d)), lastVisible: snap.docs[snap.docs.length - 1] || null };
		} catch {
			return { cars: [], lastVisible: null };
		}
	}
}

// ─── Rentals ──────────────────────────────────────────────────────────

/**
 * Search rentals with filters.
 */
export async function searchRentals(filters = {}) {
	const { type, locationId, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, cursor } = filters;

	try {
		const constraints = [];
		if (type) constraints.push(where('type', '==', type));
		if (locationId) constraints.push(where('locationId', '==', locationId));

		switch (sortBy) {
			case 'price_asc':
				constraints.push(orderBy('pricing.basePrice', 'asc'));
				break;
			case 'price_desc':
				constraints.push(orderBy('pricing.basePrice', 'desc'));
				break;
			default:
				constraints.push(orderBy('createdAt', 'desc'));
		}

		constraints.push(limit(pageSize));
		if (cursor) constraints.push(startAfter(cursor));

		const q = query(collection(db, 'rentals'), ...constraints);
		const snap = await getDocs(q);
		let rentals = snap.docs.map((d) => serializeDoc(d));

		if (minPrice != null && minPrice !== '') rentals = rentals.filter((r) => r.pricing?.basePrice >= minPrice);
		if (maxPrice != null && maxPrice !== '') rentals = rentals.filter((r) => r.pricing?.basePrice <= maxPrice);

		return { rentals, lastVisible: snap.docs[snap.docs.length - 1] || null };
	} catch (error) {
		console.error('[searchRentals] Error:', error.message);
		try {
			const q = query(collection(db, 'rentals'), orderBy('createdAt', 'desc'), limit(pageSize));
			const snap = await getDocs(q);
			return { rentals: snap.docs.map((d) => serializeDoc(d)), lastVisible: snap.docs[snap.docs.length - 1] || null };
		} catch {
			return { rentals: [], lastVisible: null };
		}
	}
}

// ─── Locations ────────────────────────────────────────────────────────

/**
 * Fetch all locations (cached per request — React.cache deduplicates).
 * @returns {Promise<Object[]>}
 */
export const getLocations = cache(async () => {
	const snap = await getDocs(query(locationsCol, orderBy('name', 'asc')));
	return snap.docs.map((d) => serializeDoc(d));
});

/**
 * Fetch featured locations.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedLocations(count = 8) {
	const q = query(locationsCol, where('isFeatured', '==', true), limit(count));
	const snap = await getDocs(q);
	return snap.docs.map((d) => serializeDoc(d));
}

/**
 * Fetch location by slug.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getLocationBySlug(slug) {
	return getDocBySlug('locations', slug);
}

// ─── Bookings ─────────────────────────────────────────────────────────

/**
 * Create a booking document.
 * @param {Object} bookingData
 * @returns {Promise<string>} Booking ID
 */
export async function createBooking(bookingData) {
	const bookingCode = `9T-${Date.now().toString(36).toUpperCase()}`;
	return createDoc('bookings', { bookingCode, ...bookingData, bookingStatus: 'pending', paymentStatus: 'pending', erpSyncStatus: 'pending' });
}

/**
 * Get a booking by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getBookingById(id) {
	return getDocById('bookings', id);
}

/**
 * Fetch bookings for a user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserBookings(userId) {
	const q = query(bookingsCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
	const snap = await getDocs(q);
	return snap.docs.map((d) => serializeDoc(d));
}

/**
 * Update booking status.
 * @param {string} bookingId
 * @param {Object} updates
 */
export async function updateBooking(bookingId, updates) {
	await updateDocById('bookings', bookingId, updates);
}

// ─── Reviews ──────────────────────────────────────────────────────────

/**
 * Fetch reviews for a service.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {{ pageSize?: number, cursor?: * }} options
 * @returns {Promise<{reviews: Object[], lastVisible: *}>}
 */
export async function getReviews(serviceType, serviceId, { pageSize = 10, cursor = null } = {}) {
	const baseConstraints = [where('serviceType', '==', serviceType), where('serviceId', '==', serviceId), where('status', '==', 'approved'), orderBy('createdAt', 'desc')];

	const q = cursor ? query(reviewsCol, ...baseConstraints, startAfter(cursor), limit(pageSize)) : query(reviewsCol, ...baseConstraints, limit(pageSize));

	const snap = await getDocs(q);
	return { reviews: snap.docs.map((d) => serializeDoc(d)), lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Submit a review.
 * @param {Object} reviewData
 * @returns {Promise<string>}
 */
export async function createReview(reviewData) {
	return createDoc('reviews', { ...reviewData, status: 'pending' });
}

/**
 * Fetch all reviews written by a specific user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserReviews(userId) {
	const q = query(reviewsCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
	const snap = await getDocs(q);
	return snap.docs.map((d) => serializeDoc(d));
}

// ─── Users ────────────────────────────────────────────────────────────

/**
 * Create or update user profile.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
export async function upsertUserProfile(uid, profileData) {
	const ref = doc(db, 'users', uid);
	const snap = await getDoc(ref);
	if (snap.exists()) {
		await updateDoc(ref, { ...profileData, updatedAt: serverTimestamp() });
	} else {
		await setDoc(ref, { ...profileData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
	}
	return { id: uid, ...profileData };
}

/**
 * Fetch user profile by UID.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
	return getDocById('users', uid);
}

/**
 * Toggle wishlist item for a user.
 * @param {string} uid
 * @param {string} serviceId
 * @param {boolean} isAdding
 */
export async function toggleWishlist(uid, serviceId, isAdding) {
	const ref = doc(db, 'users', uid);
	if (isAdding) {
		await updateDoc(ref, { wishlist: arrayUnion(serviceId) });
	} else {
		await updateDoc(ref, { wishlist: arrayRemove(serviceId) });
	}
}

/**
 * Remove an item from user's wishlist.
 * @param {string} uid
 * @param {string} serviceId
 */
export async function removeFromWishlist(uid, serviceId) {
	return toggleWishlist(uid, serviceId, false);
}

/**
 * Fetch detailed wishlist items for a user.
 * @param {string} uid
 * @returns {Promise<Object[]>}
 */
export async function getUserWishlist(uid) {
	const userProfile = await getUserProfile(uid);
	if (!userProfile || !userProfile.wishlist || userProfile.wishlist.length === 0) {
		return [];
	}

	// Fetch details for each item in the wishlist
	// Note: In a real app with many items, you might want to batch this or use a different schema.
	const detailPromises = userProfile.wishlist.map(async (itemId) => {
		// Try fetching from different collections
		const collections = ['tours', 'hotels', 'activities'];
		for (const col of collections) {
			const item = await getDocById(col, itemId);
			if (item) {
				return { ...item, type: col.replace(/s$/, '') }; // 'tours' -> 'tour'
			}
		}
		return null;
	});

	const results = await Promise.all(detailPromises);
	return results.filter((item) => item !== null);
}

// ─── Coupons ──────────────────────────────────────────────────────────

/**
 * Validate a coupon code.
 * @param {string} code
 * @returns {Promise<Object|null>} Coupon data or null if invalid
 */
export async function validateCoupon(code) {
	const q = query(couponsCol, where('code', '==', code), where('status', '==', 'active'), limit(1));
	const snap = await getDocs(q);
	if (snap.empty) return null;
	const coupon = serializeDoc(snap.docs[0]);

	// expireDate is already serialized to ISO string by serializeTimestamp
	if (coupon.expireDate && new Date(coupon.expireDate) < new Date()) return null;
	if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return null;

	return coupon;
}

// ─── Inventory Hold ───────────────────────────────────────────────────

const inventoryHoldsCol = collection(db, 'inventory_holds');

/**
 * Hold inventory temporarily (15 minutes, cleared by client or Cloud Function).
 * @param {string} serviceId
 * @param {string} serviceType
 * @param {*} startDate
 * @param {*} endDate
 * @param {number} quantity
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function createInventoryHold(serviceId, serviceType, startDate, endDate, quantity, userId) {
	return createDoc('inventory_holds', {
		serviceId,
		serviceType,
		startDate,
		endDate,
		quantity,
		userId,
		heldAt: serverTimestamp(),
		expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Updated to 15 mins as per implementation_plan
	});
}

/**
 * Release inventory hold.
 * @param {string} holdId
 */
export async function releaseInventoryHold(holdId) {
	await deleteDocById('inventory_holds', holdId);
}

/**
 * Check real-time availability considering bookings and active holds.
 * @param {string} serviceId
 * @param {string} serviceType
 * @param {*} startDate
 * @param {number} totalCapacity
 * @returns {Promise<number>} Available slots
 */
export async function getRealAvailability(serviceId, serviceType, startDate, totalCapacity) {
	// 1. Count confirmed bookings
	const bookingsQ = query(bookingsCol, where('serviceId', '==', serviceId), where('startDate', '==', startDate), where('bookingStatus', '==', 'confirmed'));
	const bookingsSnap = await getDocs(bookingsQ);
	const bookedCount = bookingsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

	// 2. Count active inventory holds (not expired)
	const now = new Date();
	const holdsQ = query(inventoryHoldsCol, where('serviceId', '==', serviceId), where('startDate', '==', startDate), where('expiresAt', '>', now));
	const holdsSnap = await getDocs(holdsQ);
	const heldCount = holdsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

	return Math.max(0, totalCapacity - bookedCount - heldCount);
}

// ─── Notifications ────────────────────────────────────────────────────

/**
 * Fetch user notifications.
 * @param {string} userId
 * @param {number} pageSize
 * @returns {Promise<Object[]>}
 */
export async function getUserNotifications(userId, pageSize = 20) {
	const q = query(notificationsCol, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(pageSize));
	const snap = await getDocs(q);
	return snap.docs.map((d) => serializeDoc(d));
}

/**
 * Mark notification as read.
 * @param {string} notificationId
 */
export async function markNotificationRead(notificationId) {
	await updateDocById('notifications', notificationId, { isRead: true });
}

// ─── Settings ─────────────────────────────────────────────────────────

/**
 * Fetch site settings (singleton doc with ID "site").
 * @returns {Promise<Object|null>}
 */
export async function getSiteSettings() {
	return getDocById('settings', 'site');
}
