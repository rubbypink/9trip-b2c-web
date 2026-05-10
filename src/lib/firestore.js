/**
 * ⚠️ CLIENT SDK DATA LAYER — for Client Components only ('use client').
 *
 * All read-only functions are deprecated for Server Components and API routes.
 * Use `@/lib/firestore-admin` (Admin SDK) instead for:
 *   - Server Components (page.js, layout.js)
 *   - API Routes (route.js)
 *   - Server-only Components (.jsx WITHOUT 'use client')
 *
 * Keep using this file for:
 *   - Client Components that need Firebase Auth context
 *   - Write operations (createBooking, createReview, toggleWishlist, etc.)
 *   - Cart and Wishlist operations that require the current user's auth state
 *
 * @see firestore-admin.js for the Admin SDK equivalent
 */

import { doc, getDoc, getDocs, collection, query, where, orderBy, limit, startAfter, updateDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove, setDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';

// ─── Collection References ────────────────────────────────────────────

const bookingsCol = collection(db, 'bookings');
const reviewsCol = collection(db, 'reviews');
const usersCol = collection(db, 'users');
const couponsCol = collection(db, 'coupons');
const notificationsCol = collection(db, 'notifications');
const inventoryHoldsCol = collection(db, 'inventory_holds');

// ─── Serialization ────────────────────────────────────────────────────

/**
 * Convert Firestore special types to plain serializable objects.
 * @param {*} value
 * @returns {*}
 */
function serializeTimestamp(value) {
  if (value === null || value === undefined) return value;

  if (value && typeof value.toDate === 'function' && typeof value.seconds === 'number') {
    return value.toDate().toISOString();
  }

  if (value && typeof value.path === 'string' && typeof value.id === 'string' && typeof value.parent === 'object') {
    return { _ref: value.path };
  }

  if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number' && typeof value.isEqual === 'function') {
    return { lat: value.latitude, lng: value.longitude };
  }

  if (value instanceof Uint8Array) {
    let binary = '';
    for (let i = 0; i < value.length; i++) binary += String.fromCharCode(value[i]);
    return btoa(binary);
  }

  if (value && typeof value.isEqual === 'function' && typeof value._methodName === 'string') {
    return undefined;
  }

  if (Array.isArray(value)) return value.map(serializeTimestamp);

  if (typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const serialized = serializeTimestamp(v);
      if (serialized !== undefined) out[k] = serialized;
    }
    return out;
  }
  return value;
}

/**
 * Serialize a Firestore document snapshot to a plain object.
 * @param {import("firebase/firestore").DocumentSnapshot} snap
 * @returns {Object}
 */
function serializeDoc(snap) {
  return serializeTimestamp({ id: snap.id, ...snap.data() });
}

/**
 * Generate the next sequential ID for a collection using a counters collection.
 * Each document in `counters` tracks the current sequence for a collection.
 * Initializes at 10000 if the counter document does not exist.
 * @param {string} colName - Collection name (e.g., "bookings", "users")
 * @returns {Promise<string>} - Next sequential ID as string (e.g., "10000")
 */
export async function generateNextId(colName) {
  const counterRef = doc(db, 'counters', colName);
  try {
    const nextId = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      if (!snap.exists()) {
        transaction.set(counterRef, { seq: 10000 });
        return '10000';
      }
      const currentSeq = snap.data().seq;
      const nextSeq = currentSeq + 1;
      transaction.update(counterRef, { seq: nextSeq });
      return String(nextSeq);
    });
    return nextId;
  } catch (error) {
    logger.error(`[generateNextId] Error for ${colName}:`, error.message);
    throw error;
  }
}

// ─── Generic Helpers ──────────────────────────────────────────────────

/**
 * Fetch a single document by ID from any collection.
 * @param {string} colName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getDocById(colName, id) {
  try {
    const snap = await getDoc(doc(db, colName, id));
    return snap.exists() ? serializeDoc(snap) : null;
  } catch (error) {
    logger.error(`[getDocById] Error fetching ${colName}/${id}:`, error.message);
    return null;
  }
}

/**
 * Create a document in a collection.
 * @param {string} colName
 * @param {Object} data
 * @returns {Promise<string|null>}
 */
export async function createDoc(colName, data) {
  try {
    const id = await generateNextId(colName);
    await setDoc(doc(db, colName, id), { ...data, id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  } catch (error) {
    logger.error(`[createDoc] Error creating ${colName}:`, error.message);
    return null;
  }
}

/**
 * Update a document by ID.
 * @param {string} colName
 * @param {string} id
 * @param {Object} data
 */
export async function updateDocById(colName, id, data) {
  try {
    await updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    logger.error(`[updateDocById] Error updating ${colName}/${id}:`, error.message);
  }
}

/**
 * Delete a document by ID.
 * @param {string} colName
 * @param {string} id
 */
export async function deleteDocById(colName, id) {
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (error) {
    logger.error(`[deleteDocById] Error deleting ${colName}/${id}:`, error.message);
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────

/**
 * Create a booking document.
 * @param {Object} bookingData
 * @returns {Promise<string|null>}
 */
export async function createBooking(bookingData) {
  try {
    const rawItems = bookingData.items || [];
    const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const deposit = items.reduce((sum, item) => {
      const prepaidPct = item.prepaid || 0;
      return sum + (item.total || 0) * prepaidPct / 100;
    }, 0);
    const balance = total - deposit;

    const allOrder = items.length > 0 && items.every(item => (item.prepaid || 0) === 0);
    const prepaidType = allOrder ? 'order' : (deposit >= total ? 'full' : 'deposit');
    const status = allOrder ? 'ordered' : 'pending';

    let dueDate = null;
    if (allOrder) {
      dueDate = items[0]?.startDate || null;
    } else {
      dueDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    const contactInfo = {
      fullName: bookingData.contactInfo?.fullName || '',
      email: bookingData.contactInfo?.email || '',
      phone: bookingData.contactInfo?.phone || '',
      specialRequests: bookingData.contactInfo?.specialRequests || ''
    };

    const bookingCode = `9T-${Date.now().toString(36).toUpperCase()}`;

    // Strip old schema fields before creating
    const { paymentStatus, bookingStatus, paymentGateway, pricing, ...cleanData } = bookingData;

    const id = await createDoc('bookings', {
      ...cleanData,
      bookingCode,
      payment: {
        prepaid: prepaidType,
        total: Math.round(total),
        deposit: Math.round(deposit),
        balance: Math.round(balance),
        gate: (bookingData.paymentGateway || 'CASH').toUpperCase(),
        date: null,
        dueDate: dueDate
      },
      status: status,
      contactInfo: contactInfo,
      erpSyncStatus: 'pending'
    });
    return id;
  } catch (error) {
    logger.error('[createBooking] Error:', error.message);
    return null;
  }
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
 * Find bookings by contact email address.
 * Queries the bookings collection where contactInfo.email matches.
 * @param {string} email - The email address to search for.
 * @returns {Promise<Object[]>}
 */
export async function findBookingsByEmail(email) {
  try {
    const q = query(bookingsCol, where('contactInfo.email', '==', email), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d));
  } catch (error) {
    logger.error(`[findBookingsByEmail] Error for email=${email}:`, error.message);
    return [];
  }
}

/**
 * Find bookings by contact phone number.
 * Queries the bookings collection where contactInfo.phone matches.
 * @param {string} phone - The phone number to search for.
 * @returns {Promise<Object[]>}
 */
export async function findBookingsByPhone(phone) {
  try {
    const q = query(bookingsCol, where('contactInfo.phone', '==', phone), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d));
  } catch (error) {
    logger.error(`[findBookingsByPhone] Error for phone=${phone}:`, error.message);
    return [];
  }
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
 * Submit a review.
 * @param {Object} reviewData
 * @returns {Promise<string|null>}
 */
export async function createReview(reviewData) {
  try {
    const id = await createDoc('reviews', { ...reviewData, status: 'pending' });
    return id;
  } catch (error) {
    logger.error('[createReview] Error:', error.message);
    return null;
  }
}

/**
 * Fetch all reviews written by a specific user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserReviews(userId) {
  try {
    const q = query(reviewsCol, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d));
  } catch (error) {
    logger.error(`[getUserReviews] Error for user=${userId}:`, error.message);
    return [];
  }
}

/**
 * Find reviews by reviewer email address.
 * Queries the reviews collection where userEmail matches.
 * @param {string} email - The email address to search for.
 * @returns {Promise<Object[]>}
 */
export async function findReviewsByEmail(email) {
  try {
    const q = query(reviewsCol, where('userEmail', '==', email), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => serializeDoc(d));
  } catch (error) {
    logger.error(`[findReviewsByEmail] Error for email=${email}:`, error.message);
    return [];
  }
}

// ─── Users ────────────────────────────────────────────────────────────

/**
 * Find a user document by Firebase Auth UID (uid field).
 * Falls back to legacy doc-by-UID pattern for pre-migration users.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{docId: string, data: Object}|null>}
 */
async function getUserByUid(uid) {
  const q = query(usersCol, where('uid', '==', uid), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { docId: snap.docs[0].id, data: serializeDoc(snap.docs[0]) };
  }
  // Legacy fallback: user doc ID might still be Auth UID (pre-migration)
  const legacyRef = doc(db, 'users', uid);
  const legacySnap = await getDoc(legacyRef);
  if (legacySnap.exists()) {
    return { docId: uid, data: serializeDoc(legacySnap) };
  }
  return null;
}

/**
 * Create or update user profile.
 * Uses sequential ID (via generateNextId) for new users and stores
 * the Firebase Auth UID inside the document as the `uid` field.
 * On subsequent calls, finds the existing user by `uid` field and updates it.
 * Also handles legacy users whose doc ID equals their Auth UID.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} profileData
 * @returns {Promise<{id: string, uid: string, isNew: boolean, ...profileData}>}
 */
export async function upsertUserProfile(uid, profileData) {
  try {
    const existing = await getUserByUid(uid);
    if (existing) {
      await updateDoc(doc(db, 'users', existing.docId), { ...profileData, updatedAt: serverTimestamp() });
      return { id: existing.docId, uid, isNew: false, ...profileData };
    }

    // Create new user with sequential ID
    const id = await generateNextId('users');
    await setDoc(doc(db, 'users', id), {
      ...profileData,
      id,
      uid,
      role: 'customer',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id, uid, isNew: true, ...profileData };
  } catch (error) {
    logger.error(`[upsertUserProfile] Error for uid=${uid}:`, error.message);
    throw error;
  }
}

/**
 * Fetch user profile by Firebase Auth UID.
 * Queries by the `uid` field inside the document, with legacy fallback
 * to direct doc-by-UID lookup for pre-migration users.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  try {
    const result = await getUserByUid(uid);
    return result ? result.data : null;
  } catch (error) {
    logger.error(`[getUserProfile] Error for uid=${uid}:`, error.message);
    return null;
  }
}

/**
 * Toggle wishlist item for a user.
 * Finds the user by `uid` field first, then updates wishlist.
 * @param {string} uid - Firebase Auth UID
 * @param {string} serviceId
 * @param {boolean} isAdding
 */
export async function toggleWishlist(uid, serviceId, isAdding) {
  const existing = await getUserByUid(uid);
  if (!existing) {
    logger.error(`[toggleWishlist] User not found for uid=${uid}`);
    return;
  }
  const ref = doc(db, 'users', existing.docId);
  if (isAdding) {
    await updateDoc(ref, { wishlist: arrayUnion(serviceId) });
  } else {
    await updateDoc(ref, { wishlist: arrayRemove(serviceId) });
  }
}

/**
 * Remove an item from user's wishlist.
 * @param {string} uid - Firebase Auth UID
 * @param {string} serviceId
 */
export async function removeFromWishlist(uid, serviceId) {
  return toggleWishlist(uid, serviceId, false);
}

/**
 * Fetch detailed wishlist items for a user.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object[]>}
 */
export async function getUserWishlist(uid) {
  const userProfile = await getUserProfile(uid);
  if (!userProfile || !userProfile.wishlist || userProfile.wishlist.length === 0) return [];

  const detailPromises = userProfile.wishlist.map(async (itemId) => {
    const collections = ['tours', 'hotels', 'activities'];
    for (const col of collections) {
      const item = await getDocById(col, itemId);
      if (item) return { ...item, type: col.replace(/s$/, '') };
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
 * @returns {Promise<Object|null>}
 */
export async function validateCoupon(code) {
  const q = query(couponsCol, where('code', '==', code), where('status', '==', 'active'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const coupon = serializeDoc(snap.docs[0]);

  if (coupon.expireDate && new Date(coupon.expireDate) < new Date()) return null;
  if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return null;

  return coupon;
}

// ─── Inventory Hold ───────────────────────────────────────────────────

/**
 * Hold inventory temporarily (15 minutes, cleared by client or TTL).
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
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
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
 * @returns {Promise<number>}
 */
export async function getRealAvailability(serviceId, serviceType, startDate, totalCapacity) {
  const bookingsQ = query(bookingsCol, where('serviceId', '==', serviceId), where('startDate', '==', startDate), where('status', '==', 'confirmed'));
  const bookingsSnap = await getDocs(bookingsQ);
  const bookedCount = bookingsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

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

// ─── Hotel Pricing Utilities (pure functions, no DB) ──────────────────

/**
 * Resolve pricing for a specific room on a specific date from a price schedule.
 * @param {Object} priceSchedule
 * @param {string} roomId
 * @param {string} date
 * @returns {Array}
 */
export function resolveRoomPricing(priceSchedule, roomId, date) {
  if (!priceSchedule?.priceData || !roomId) return [];
  const priceData = priceSchedule.priceData;
  const result = [];
  const prefix = roomId + '_';

  for (const [key, periods] of Object.entries(priceData)) {
    if (!key.startsWith(prefix)) continue;
    const rateType = key.slice(prefix.length);
    if (typeof periods !== 'object' || periods === null) continue;

    for (const [periodKey, pricing] of Object.entries(periods)) {
      if (!pricing || typeof pricing !== 'object') continue;
      if (pricing.startDate && pricing.endDate && date >= pricing.startDate && date <= pricing.endDate) {
        result.push({ rateType, costPrice: Number(pricing.costPrice) || 0, sellPrice: Number(pricing.sellPrice) || 0, startDate: pricing.startDate, endDate: pricing.endDate, supplier: pricing.supplier || '', periodKey, prepaid: Number(pricing.prepaid) || 100 });
      }
    }
  }
  result.sort((a, b) => a.sellPrice - b.sellPrice);
  return result;
}

/**
 * Get the lowest sell price for a room on a specific date.
 * @param {Object} priceSchedule
 * @param {string} roomId
 * @param {string} date
 * @returns {number}
 */
export function getLowestRoomPrice(priceSchedule, roomId, date) {
  const pricing = resolveRoomPricing(priceSchedule, roomId, date);
  return pricing.length === 0 ? 0 : pricing[0].sellPrice;
}

/**
 * Get the lowest price across all rooms in a hotel for a given date.
 * @param {Object} priceSchedule
 * @param {Array} rooms
 * @param {string} date
 * @returns {number}
 */
export function getHotelLowestPrice(priceSchedule, rooms, date) {
  if (!rooms || rooms.length === 0) return 0;
  let lowest = Infinity;
  for (const room of rooms) {
    if (!room.isActive) continue;
    const price = getLowestRoomPrice(priceSchedule, room.id, date);
    if (price > 0 && price < lowest) lowest = price;
  }
  return lowest === Infinity ? 0 : lowest;
}

/**
 * Build a pricing table for hotel detail page display.
 * @param {Object} priceSchedule
 * @param {Array|Object} rooms
 * @param {string} checkIn
 * @param {string} checkOut
 * @returns {Array}
 */
export function buildRoomPricingTable(priceSchedule, rooms, checkIn, checkOut) {
  const roomsArr = Array.isArray(rooms) ? rooms : (rooms ? Object.values(rooms) : []);
  if (roomsArr.length === 0) return [];

  const sortedRooms = [...roomsArr].sort((a, b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '');
  });

  function buildRoomRow(room, dates) {
    if (!room.isActive) {
      return { roomId: room.id, roomName: room.name, totalRooms: room.totalRooms || 0, maxGuests: room.maxGuests || 0, bedType: room.bedType || '', roomSize: room.roomSize || 0, description: room.description || '', amenities: room.amenities || [], included: room.included || [], featuredImage: room.featuredImage || '', gallery: room.gallery || [], isActive: false, sortOrder: room.sortOrder ?? 999, rateTypes: [] };
    }

    const rateTypeMap = {};
    for (const date of dates) {
      const pricing = resolveRoomPricing(priceSchedule, room.id, date);
      for (const p of pricing) {
        if (!rateTypeMap[p.rateType]) {
          rateTypeMap[p.rateType] = { rateType: p.rateType, dailyPrices: [], avgSellPrice: 0 };
        }
        rateTypeMap[p.rateType].dailyPrices.push({ date, sellPrice: p.sellPrice, costPrice: p.costPrice });
      }
    }
    const rateTypes = Object.values(rateTypeMap).map(rt => {
      rt.avgSellPrice = rt.dailyPrices.reduce((s, d) => s + d.sellPrice, 0) / (rt.dailyPrices.length || 1);
      return rt;
    });

    return { roomId: room.id, roomName: room.name, totalRooms: room.totalRooms || 0, maxGuests: room.maxGuests || 0, bedType: room.bedType || '', roomSize: room.roomSize || 0, description: room.description || '', amenities: room.amenities || [], included: room.included || [], featuredImage: room.featuredImage || '', gallery: room.gallery || [], isActive: true, sortOrder: room.sortOrder ?? 999, rateTypes };
  }

  const ci = new Date(checkIn);
  const co = new Date(checkOut);

  if (isNaN(ci.getTime()) || isNaN(co.getTime()) || co <= ci) {
    const today = new Date().toISOString().split('T')[0];
    return sortedRooms.map(room => buildRoomRow(room, [today]));
  }

  const dates = [];
  for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return sortedRooms.map(room => buildRoomRow(room, dates));
}
