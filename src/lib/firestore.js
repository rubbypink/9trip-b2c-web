import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Collection References ────────────────────────────────────────────

const toursCol = collection(db, "tours");
const hotelsCol = collection(db, "hotels");
const roomsCol = collection(db, "rooms");
const activitiesCol = collection(db, "activities");
const carsCol = collection(db, "cars");
const locationsCol = collection(db, "locations");
const bookingsCol = collection(db, "bookings");
const reviewsCol = collection(db, "reviews");
const usersCol = collection(db, "users");
const couponsCol = collection(db, "coupons");
const notificationsCol = collection(db, "notifications");

// ─── Generic Helpers ──────────────────────────────────────────────────

/**
 * Fetch a single document by ID from a collection.
 * @param {string} colName - Firestore collection name
 * @param {string} id - Document ID
 * @returns {Promise<Object|null>} Document data with id, or null
 */
export async function getDocById(colName, id) {
  const snap = await getDoc(doc(db, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Fetch a single document by slug from a collection.
 * @param {string} colName - Firestore collection name
 * @param {string} slug - URL slug
 * @returns {Promise<Object|null>}
 */
export async function getDocBySlug(colName, slug) {
  const q = query(collection(db, colName), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * Create a document in a collection.
 * @param {string} colName - Firestore collection name
 * @param {Object} data - Document data
 * @returns {Promise<string>} New document ID
 */
export async function createDoc(colName, data) {
  const ref = await addDoc(collection(db, colName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update a document by ID.
 * @param {string} colName - Firestore collection name
 * @param {string} id - Document ID
 * @param {Object} data - Fields to update
 */
export async function updateDocById(colName, id, data) {
  await updateDoc(doc(db, colName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
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
  let q = query(toursCol, orderBy("createdAt", "desc"), limit(pageSize));
  if (cursor) q = query(toursCol, orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize));
  const snap = await getDocs(q);
  const tours = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { tours, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Fetch featured tours.
 * @param {number} count - Number of tours to fetch
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedTours(count = 8) {
  const q = query(toursCol, where("isFeatured", "==", true), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const {
    locationId,
    tourTypeId,
    minPrice,
    maxPrice,
    minRating,
    sortBy = "newest",
    pageSize = 12,
    cursor,
  } = filters;

  const constraints = [];

  if (locationId) constraints.push(where("locationId", "==", locationId));
  if (tourTypeId) constraints.push(where("tourTypeId", "==", tourTypeId));
  if (minRating) constraints.push(where("ratingAverage", ">=", minRating));

  switch (sortBy) {
    case "price_asc":
      constraints.push(orderBy("pricing.adultPrice", "asc"));
      break;
    case "price_desc":
      constraints.push(orderBy("pricing.adultPrice", "desc"));
      break;
    case "rating":
      constraints.push(orderBy("ratingAverage", "desc"));
      break;
    case "newest":
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(toursCol, ...constraints);
  const snap = await getDocs(q);

  let tours = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Client-side price filtering (Firestore can't compound range queries across different fields)
  if (minPrice != null) tours = tours.filter((t) => t.pricing?.adultPrice >= minPrice);
  if (maxPrice != null) tours = tours.filter((t) => t.pricing?.adultPrice <= maxPrice);

  return { tours, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Fetch related tours (same location, excluding current).
 * @param {string} tourId - Current tour ID to exclude
 * @param {string} locationId
 * @param {number} [count=4]
 * @returns {Promise<Object[]>}
 */
export async function getRelatedTours(tourId, locationId, count = 4) {
  const q = query(toursCol, where("locationId", "==", locationId), orderBy("createdAt", "desc"), limit(count * 2));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.id !== tourId).slice(0, count);
}

// ─── Hotels ───────────────────────────────────────────────────────────

/**
 * Fetch hotels with pagination.
 * @returns {Promise<{hotels: Object[], lastVisible: *}>}
 */
export async function getHotels({ pageSize = 12, cursor = null } = {}) {
  let q = query(hotelsCol, orderBy("createdAt", "desc"), limit(pageSize));
  if (cursor) q = query(hotelsCol, orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize));
  const snap = await getDocs(q);
  const hotels = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { hotels, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Fetch featured hotels.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedHotels(count = 6) {
  const q = query(hotelsCol, where("isFeatured", "==", true), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch rooms for a specific hotel.
 * @param {string} hotelId
 * @returns {Promise<Object[]>}
 */
export async function getRoomsByHotel(hotelId) {
  const q = query(roomsCol, where("hotelId", "==", hotelId), orderBy("price", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Activities ───────────────────────────────────────────────────────

/**
 * Fetch activities with pagination.
 * @returns {Promise<{activities: Object[], lastVisible: *}>}
 */
export async function getActivitiesList({ pageSize = 12, cursor = null } = {}) {
  let q = query(activitiesCol, orderBy("createdAt", "desc"), limit(pageSize));
  if (cursor) q = query(activitiesCol, orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize));
  const snap = await getDocs(q);
  const activities = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { activities, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

// ─── Locations ────────────────────────────────────────────────────────

/**
 * Fetch all locations.
 * @returns {Promise<Object[]>}
 */
export async function getLocations() {
  const snap = await getDocs(query(locationsCol, orderBy("name", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch featured locations.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedLocations(count = 8) {
  const q = query(locationsCol, where("isFeatured", "==", true), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch location by slug.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getLocationBySlug(slug) {
  return getDocBySlug("locations", slug);
}

// ─── Bookings ─────────────────────────────────────────────────────────

/**
 * Create a booking document.
 * @param {Object} bookingData
 * @returns {Promise<string>} Booking ID
 */
export async function createBooking(bookingData) {
  const bookingCode = `9T-${Date.now().toString(36).toUpperCase()}`;
  return createDoc("bookings", {
    ...bookingData,
    bookingCode,
    bookingStatus: "pending",
    paymentStatus: "pending",
  });
}

/**
 * Fetch bookings for a user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserBookings(userId) {
  const q = query(bookingsCol, where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Update booking status.
 * @param {string} bookingId
 * @param {Object} updates
 */
export async function updateBooking(bookingId, updates) {
  await updateDocById("bookings", bookingId, updates);
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
  const baseConstraints = [
    where("serviceType", "==", serviceType),
    where("serviceId", "==", serviceId),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
  ];

  const q = cursor
    ? query(reviewsCol, ...baseConstraints, startAfter(cursor), limit(pageSize))
    : query(reviewsCol, ...baseConstraints, limit(pageSize));

  const snap = await getDocs(q);
  return { reviews: snap.docs.map((d) => ({ id: d.id, ...d.data() })), lastVisible: snap.docs[snap.docs.length - 1] || null };
}

/**
 * Submit a review.
 * @param {Object} reviewData
 * @returns {Promise<string>}
 */
export async function createReview(reviewData) {
  return createDoc("reviews", { ...reviewData, status: "pending" });
}

// ─── Users ────────────────────────────────────────────────────────────

/**
 * Create or update user profile.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
export async function upsertUserProfile(uid, profileData) {
  const ref = doc(db, "users", uid);
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
  return getDocById("users", uid);
}

/**
 * Toggle wishlist item for a user.
 * @param {string} uid
 * @param {string} serviceId
 * @param {boolean} isAdding
 */
export async function toggleWishlist(uid, serviceId, isAdding) {
  const ref = doc(db, "users", uid);
  if (isAdding) {
    await updateDoc(ref, { wishlist: arrayUnion(serviceId) });
  } else {
    await updateDoc(ref, { wishlist: arrayRemove(serviceId) });
  }
}

// ─── Coupons ──────────────────────────────────────────────────────────

/**
 * Validate a coupon code.
 * @param {string} code
 * @returns {Promise<Object|null>} Coupon data or null if invalid
 */
export async function validateCoupon(code) {
  const q = query(couponsCol, where("code", "==", code), where("status", "==", "active"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const coupon = { id: snap.docs[0].id, ...snap.docs[0].data() };

  if (coupon.expireDate && coupon.expireDate.toDate() < new Date()) return null;
  if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return null;

  return coupon;
}

// ─── Inventory Hold ───────────────────────────────────────────────────

const inventoryHoldsCol = collection(db, "inventory_holds");

/**
 * Hold inventory temporarily (10 minutes, cleared by client or Cloud Function).
 * @param {string} serviceId
 * @param {string} serviceType
 * @param {*} startDate
 * @param {number} quantity
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function createInventoryHold(serviceId, serviceType, startDate, quantity, userId) {
  return createDoc("inventory_holds", {
    serviceId,
    serviceType,
    startDate,
    quantity,
    userId,
    heldAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
}

/**
 * Release inventory hold.
 * @param {string} holdId
 */
export async function releaseInventoryHold(holdId) {
  await deleteDocById("inventory_holds", holdId);
}

// ─── Notifications ────────────────────────────────────────────────────

/**
 * Fetch user notifications.
 * @param {string} userId
 * @param {number} pageSize
 * @returns {Promise<Object[]>}
 */
export async function getUserNotifications(userId, pageSize = 20) {
  const q = query(notificationsCol, where("userId", "==", userId), orderBy("createdAt", "desc"), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Mark notification as read.
 * @param {string} notificationId
 */
export async function markNotificationRead(notificationId) {
  await updateDocById("notifications", notificationId, { isRead: true });
}

// ─── Settings ─────────────────────────────────────────────────────────

/**
 * Fetch site settings (singleton doc with ID "site").
 * @returns {Promise<Object|null>}
 */
export async function getSiteSettings() {
  return getDocById("settings", "site");
}