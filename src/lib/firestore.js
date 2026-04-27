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
 * Fetch related tours (same location, excluding current), looked up by slug.
 * @param {string} slug - Current tour slug
 * @param {number} [count=4]
 * @returns {Promise<{tours: Object[]}>}
 */
export async function getRelatedTours(slug, count = 4) {
  const tour = await getDocBySlug("tours", slug);
  if (!tour) return { tours: [] };

  const q = query(
    toursCol,
    where("locationId", "==", tour.locationId),
    orderBy("createdAt", "desc"),
    limit(count * 2)
  );
  const snap = await getDocs(q);
  const tours = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
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
  const tour = await getDocBySlug("tours", slug);
  return { tour };
}

/**
 * Fetch reviews for a tour, looked up by slug.
 * @param {string} slug - Tour slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getTourReviews(slug) {
  const tour = await getDocBySlug("tours", slug);
  if (!tour) return { reviews: [], totalRating: 0, avgRating: 0 };
  
  const { reviews } = await getReviews("tour", tour.id);
  const totalRating = reviews.length;
  const avgRating = totalRating > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating
    : 0;
  
  return { reviews, totalRating, avgRating };
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
 * Search hotels with filters.
 * @param {Object} filters
 */
export async function searchHotels(filters = {}) {
  const {
    locationId,
    starRating,
    minPrice,
    maxPrice,
    sortBy = "newest",
    pageSize = 12,
    cursor,
  } = filters;

  const constraints = [];
  if (locationId) constraints.push(where("address.cityId", "==", locationId));
  if (starRating) constraints.push(where("starRating", ">=", Number(starRating)));

  switch (sortBy) {
    case "price_asc":
      constraints.push(orderBy("pricing.basePrice", "asc"));
      break;
    case "price_desc":
      constraints.push(orderBy("pricing.basePrice", "desc"));
      break;
    case "rating":
      constraints.push(orderBy("rating", "desc"));
      break;
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(hotelsCol, ...constraints);
  const snap = await getDocs(q);
  let hotels = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (minPrice != null) hotels = hotels.filter((h) => h.pricing?.basePrice >= minPrice);
  if (maxPrice != null) hotels = hotels.filter((h) => h.pricing?.basePrice <= maxPrice);

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

/**
 * Search activities with filters.
 */
export async function searchActivities(filters = {}) {
  const {
    locationId,
    categoryId,
    minPrice,
    maxPrice,
    sortBy = "newest",
    pageSize = 12,
    cursor,
  } = filters;

  const constraints = [];
  if (locationId) constraints.push(where("locationId", "==", locationId));
  if (categoryId) constraints.push(where("categoryId", "==", categoryId));

  switch (sortBy) {
    case "price_asc":
      constraints.push(orderBy("pricing.basePrice", "asc"));
      break;
    case "price_desc":
      constraints.push(orderBy("pricing.basePrice", "desc"));
      break;
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(activitiesCol, ...constraints);
  const snap = await getDocs(q);
  let activities = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (minPrice != null) activities = activities.filter((a) => a.pricing?.basePrice >= minPrice);
  if (maxPrice != null) activities = activities.filter((a) => a.pricing?.basePrice <= maxPrice);

  return { activities, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

// ─── Cars ─────────────────────────────────────────────────────────────

/**
 * Search cars with filters.
 */
export async function searchCars(filters = {}) {
  const {
    carType,
    transmission,
    minPrice,
    maxPrice,
    sortBy = "newest",
    pageSize = 12,
    cursor,
  } = filters;

  const constraints = [];
  if (carType) constraints.push(where("carType", "==", carType));
  if (transmission) constraints.push(where("transmission", "==", transmission));

  switch (sortBy) {
    case "price_asc":
      constraints.push(orderBy("pricing.basePrice", "asc"));
      break;
    case "price_desc":
      constraints.push(orderBy("pricing.basePrice", "desc"));
      break;
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(carsCol, ...constraints);
  const snap = await getDocs(q);
  let cars = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (minPrice != null) cars = cars.filter((c) => c.pricing?.basePrice >= minPrice);
  if (maxPrice != null) cars = cars.filter((c) => c.pricing?.basePrice <= maxPrice);

  return { cars, lastVisible: snap.docs[snap.docs.length - 1] || null };
}

// ─── Rentals ──────────────────────────────────────────────────────────

/**
 * Search rentals with filters.
 */
export async function searchRentals(filters = {}) {
  const {
    type,
    locationId,
    minPrice,
    maxPrice,
    sortBy = "newest",
    pageSize = 12,
    cursor,
  } = filters;

  const constraints = [];
  if (type) constraints.push(where("type", "==", type));
  if (locationId) constraints.push(where("locationId", "==", locationId));

  switch (sortBy) {
    case "price_asc":
      constraints.push(orderBy("pricing.basePrice", "asc"));
      break;
    case "price_desc":
      constraints.push(orderBy("pricing.basePrice", "desc"));
      break;
    default:
      constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(pageSize));
  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, "rentals"), ...constraints);
  const snap = await getDocs(q);
  let rentals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (minPrice != null) rentals = rentals.filter((r) => r.pricing?.basePrice >= minPrice);
  if (maxPrice != null) rentals = rentals.filter((r) => r.pricing?.basePrice <= maxPrice);

  return { rentals, lastVisible: snap.docs[snap.docs.length - 1] || null };
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
    ...bookingCode,
    ...bookingData,
    bookingStatus: "pending",
    paymentStatus: "pending",
    erpSyncStatus: "pending",
  });
}

/**
 * Get a booking by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getBookingById(id) {
  return getDocById("bookings", id);
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
  return createDoc("inventory_holds", {
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
  await deleteDocById("inventory_holds", holdId);
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
  const bookingsQ = query(
    bookingsCol,
    where("serviceId", "==", serviceId),
    where("startDate", "==", startDate),
    where("bookingStatus", "==", "confirmed")
  );
  const bookingsSnap = await getDocs(bookingsQ);
  const bookedCount = bookingsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

  // 2. Count active inventory holds (not expired)
  const now = new Date();
  const holdsQ = query(
    inventoryHoldsCol,
    where("serviceId", "==", serviceId),
    where("startDate", "==", startDate),
    where("expiresAt", ">", now)
  );
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