import { adminDb } from './firebase-admin';
export { adminDb };
import admin from 'firebase-admin';
import { logger } from '@9trip/shared/logger';

// ─── Serialization Helper ────────────────────────────────────────────

/**
 * Convert Admin SDK Firestore types to plain serializable objects.
 * Timestamp → ISO string, GeoPoint → {lat,lng}, DocumentReference → {_ref: path}, Bytes → base64.
 * Deep-walks objects/arrays recursively.
 * @param {*} value
 * @returns {*}
 */
function serializeAdminDoc(value) {
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

  if (Array.isArray(value)) return value.map(serializeAdminDoc);

  if (typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const serialized = serializeAdminDoc(v);
      if (serialized !== undefined) out[k] = serialized;
    }
    return out;
  }

  return value;
}

/**
 * Serialize a Firestore document snapshot to a plain object.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snap
 * @returns {Object}
 */
export function serializeSnap(snap) {
  return serializeAdminDoc({ id: snap.id, ...snap.data() });
}

/**
 * Serialize an array of document snapshots.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap
 * @returns {Object[]}
 */
export function serializeDocs(snap) {
  return snap.docs.map((d) => serializeSnap(d));
}

// ─── Collection References ───────────────────────────────────────────

const toursCol = () => adminDb.collection('tours');
const hotelsCol = () => adminDb.collection('hotels');
const activitiesCol = () => adminDb.collection('activities');
const carsCol = () => adminDb.collection('cars');
const rentalsCol = () => adminDb.collection('rentals');
const locationsCol = () => adminDb.collection('locations');
const bookingsCol = () => adminDb.collection('bookings');
const reviewsCol = () => adminDb.collection('reviews');
const usersCol = () => adminDb.collection('users');
const couponsCol = () => adminDb.collection('coupons');
const notificationsCol = () => adminDb.collection('notifications');
const inventoryHoldsCol = () => adminDb.collection('inventory_holds');
const blogsCol = () => adminDb.collection('blogs');

// ─── In-Memory Cache ─────────────────────────────────────────────────

/** @type {{ LOCATIONS: number, COUNTS: number }} */
const CACHE_TTL = {
  /** 5 minutes — locations rarely change */
  LOCATIONS: 5 * 60 * 1000,
  /** 2 minutes — counts update when inventory changes */
  COUNTS: 2 * 60 * 1000,
};

/** @type {Map<string, { value: any, expiresAt: number }>} */
const _cache = new Map();

/**
 * Retrieve a value from cache if not expired.
 * @param {string} key
 * @returns {any|undefined}
 */
function _cacheGet(key) {
  const entry = _cache.get(key);
  if (entry && Date.now() <= entry.expiresAt) return entry.value;
  if (entry) _cache.delete(key);
  return undefined;
}

/**
 * Store a value in cache with a TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs
 */
function _cacheSet(key, value, ttlMs) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Build a cache key from a prefix and optional filter object.
 * @param {string} prefix
 * @param {Object} [filters={}]
 * @returns {string}
 */
function _cacheKey(prefix, filters = {}) {
  return `${prefix}:${JSON.stringify(filters)}`;
}

/**
 * Generate the next sequential ID for a collection (Admin SDK).
 * Uses `counters` collection with Firestore transaction for atomicity.
 * Initializes at 10000 if counter doesn't exist.
 * @param {string} colName
 * @returns {Promise<string>}
 */
export async function generateNextId(colName) {
  const counterRef = adminDb.collection('counters').doc(colName);
  return adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    if (!snap.exists) {
      transaction.set(counterRef, { seq: 10000 });
      return '10000';
    }
    const currentSeq = snap.data().seq;
    const nextSeq = currentSeq + 1;
    transaction.update(counterRef, { seq: nextSeq });
    return String(nextSeq);
  });
}

// ─── Generic Helpers ─────────────────────────────────────────────────

/**
 * Fetch a single document by ID from a collection.
 * @param {string} colName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getDocById(colName, id) {
  logger.log('[getDocById] Called with:', { colName, id });
  try {
    const snap = await adminDb.collection(colName).doc(id).get();
    const result = snap.exists ? serializeSnap(snap) : null;
    logger.log('[getDocById] Result:', { id: result?.id, exists: !!result });
    return result;
  } catch (error) {
    logger.error(`[getDocById] Error fetching ${colName}/${id}:`, error.message);
    logger.log('[getDocById] Result: null (error)');
    return null;
  }
}

/**
 * Fetch a single document by slug from a collection.
 * @param {string} colName
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getDocBySlug(colName, slug) {
  logger.log('[getDocBySlug] Called with:', { colName, slug });
  try {
    const snap = await adminDb.collection(colName).where('slug', '==', slug).limit(1).get();
    if (snap.empty) {
      logger.log('[getDocBySlug] Result: null (not found)');
      return null;
    }
    const result = serializeSnap(snap.docs[0]);
    logger.log('[getDocBySlug] Result:', { id: result?.id, slug });
    return result;
  } catch (error) {
    logger.error(`[getDocBySlug] Error fetching ${colName}/${slug}:`, error.message);
    logger.log('[getDocBySlug] Result: null (error)');
    return null;
  }
}

// ─── Tours ───────────────────────────────────────────────────────────

/**
 * Fetch all tours, newest first, paginated.
 * @param {{ pageSize?: number, cursor?: import('firebase-admin/firestore').DocumentSnapshot }} options
 * @returns {Promise<{tours: Object[], lastVisible: Object|null}>}
 */
export async function getTours({ pageSize = 12, cursor = null } = {}) {
  logger.log('[getTours] Called with:', { pageSize, cursor: cursor ? '<cursor>' : null });
  try {
    let q = toursCol().orderBy('createdAt', 'desc').limit(pageSize);
    if (cursor) q = toursCol().orderBy('createdAt', 'desc').startAfter(cursor).limit(pageSize);
    const snap = await q.get();
    const toursResult = { tours: serializeDocs(snap).map(t => ({ ...t, pricing: { ...(t.pricing || {}), prepaid: t.pricing?.prepaid ?? 50 } })), lastVisible: snap.docs[snap.docs.length - 1] || null };
    logger.log('[getTours] Result:', { count: toursResult.tours.length, hasMore: !!toursResult.lastVisible });
    return toursResult;
  } catch (error) {
    logger.error('[getTours] Error:', error.message);
    logger.log('[getTours] Result: empty (error)');
    return { tours: [], lastVisible: null };
  }
}

/**
 * Fetch featured tours.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedTours(count = 8) {
  logger.log('[getFeaturedTours] Called with:', { count });
  try {
    const snap = await toursCol().where('isFeatured', '==', true).orderBy('createdAt', 'desc').limit(count).get();
    if (!snap.empty) {
      const result = serializeDocs(snap).map(t => ({ ...t, pricing: { ...(t.pricing || {}), prepaid: t.pricing?.prepaid ?? 50 } }));
      logger.log('[getFeaturedTours] Result:', { count: result.length });
      return result;
    }
  } catch (error) {
    logger.error('[getFeaturedTours] Index not ready, falling back:', error.message);
  }
  try {
    const snap = await toursCol().orderBy('createdAt', 'desc').limit(count).get();
    const result = serializeDocs(snap).map(t => ({ ...t, pricing: { ...(t.pricing || {}), prepaid: t.pricing?.prepaid ?? 50 } }));
    logger.log('[getFeaturedTours] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getFeaturedTours] Fallback error:', error.message);
    logger.log('[getFeaturedTours] Result: empty (error)');
    return [];
  }
}

/**
 * Search tours with filters.
 * @param {Object} filters
 * @returns {Promise<{tours: Object[]}>}
 */
export async function searchTours(filters = {}) {
  const { locationId, tourTypeId, minPrice, maxPrice, minRating, sortBy = 'newest', pageSize = 12, page = 1, cursor } = filters;
  logger.log('[searchTours] Called with:', { locationId, tourTypeId, minPrice, maxPrice, minRating, sortBy, pageSize, page, hasCursor: !!filters.cursor });
  try {
    let q = toursCol();
    if (locationId) q = q.where('locationId', '==', locationId);
    if (tourTypeId) q = q.where('tourTypeId', '==', tourTypeId);
    if (minRating) q = q.where('rating.average', '>=', minRating);

    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.adultPrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.adultPrice', 'desc'); break;
      case 'rating': q = q.orderBy('rating.average', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }

    const limitVal = cursor ? pageSize : (page > 1 ? page * pageSize : pageSize);
    q = q.limit(limitVal);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    let tours = serializeDocs(snap).map(t => ({ ...t, pricing: { ...(t.pricing || {}), prepaid: t.pricing?.prepaid ?? 50 } }));

    if (minPrice != null && minPrice !== '') tours = tours.filter((t) => t.pricing?.adultPrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') tours = tours.filter((t) => t.pricing?.adultPrice <= Number(maxPrice));

    logger.log('[searchTours] Result:', { count: tours.length, hasMore: true });
    return { tours, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    logger.error('[searchTours] Error:', error.message);
    try {
      const snap = await toursCol().orderBy('createdAt', 'desc').limit(cursor ? pageSize : (page > 1 ? page * pageSize : pageSize)).get();
      const fallbackResult = { tours: serializeDocs(snap).map(t => ({ ...t, pricing: { ...(t.pricing || {}), prepaid: t.pricing?.prepaid ?? 50 } })), lastVisible: snap.docs[snap.docs.length - 1] || null };
      logger.log('[searchTours] Result:', { count: fallbackResult.tours.length, hasMore: !!fallbackResult.lastVisible });
      return fallbackResult;
    } catch {
      logger.log('[searchTours] Result: empty (fallback error)');
      return { tours: [], lastVisible: null };
    }
  }
}

/**
 * Count tours with filters.
 * @param {Object} filters
 * @returns {Promise<number>}
 */
export async function countTours(filters = {}) {
  logger.log('[countTours] Called with:', { filters });
  const key = _cacheKey('countTours', filters);
  const cached = _cacheGet(key);
  if (cached !== undefined) {
    logger.log('[countTours] Result: cached', { count: cached });
    return cached;
  }

  const { locationId, tourTypeId, minRating } = filters;
  try {
    let q = toursCol();
    if (locationId) q = q.where('locationId', '==', locationId);
    if (tourTypeId) q = q.where('tourTypeId', '==', tourTypeId);
    if (minRating) q = q.where('rating.average', '>=', minRating);
    const snap = await q.count().get();
    const count = snap.data().count;
    _cacheSet(key, count, CACHE_TTL.COUNTS);
    logger.log('[countTours] Result:', { count });
    return count;
  } catch (error) {
    logger.error('[countTours] Error:', error.message);
    logger.log('[countTours] Result: 0 (error)');
    return 0;
  }
}

/**
 * Fetch related tours (same location, excluding current).
 * @param {string} slug
 * @param {number} [count=4]
 * @returns {Promise<{tours: Object[]}>}
 */
export async function getRelatedTours(slug, count = 4) {
  logger.log('[getRelatedTours] Called with:', { slug, count });
  try {
    const tour = await getDocBySlug('tours', slug);
    if (!tour || !tour.locationId) return { tours: [] };

    const snap = await toursCol().where('locationId', '==', tour.locationId).orderBy('createdAt', 'desc').limit(count * 2).get();
    const tours = serializeDocs(snap).filter((t) => t.id !== tour.id).slice(0, count).map(t => ({ ...t, pricing: { ...(t.pricing || {}), prepaid: t.pricing?.prepaid ?? 50 } }));
    logger.log('[getRelatedTours] Result:', { count: tours.length });
    return { tours };
  } catch (error) {
    logger.error('[getRelatedTours] Error:', error.message);
    logger.log('[getRelatedTours] Result: empty (error)');
    return { tours: [] };
  }
}

/**
 * Fetch a single tour by slug.
 * @param {string} slug
 * @returns {Promise<{tour: Object|null}>}
 */
export async function getTourBySlug(slug) {
  logger.log('[getTourBySlug] Called with:', { slug });
  try {
    const tour = await getDocBySlug('tours', slug);
    if (tour) tour.pricing = { ...(tour.pricing || {}), prepaid: tour.pricing?.prepaid ?? 50 };
    logger.log('[getTourBySlug] Result:', { found: !!tour, slug });
    return { tour };
  } catch (error) {
    logger.error('[getTourBySlug] Error:', error.message);
    logger.log('[getTourBySlug] Result: null (error)');
    return { tour: null };
  }
}

/**
 * Fetch pricing tiers for a tour (subcollection: tours/{tourId}/tourPricing).
 * @param {string} tourId
 * @returns {Promise<Object[]>}
 */
export async function getTourPricing(tourId) {
  logger.log('[getTourPricing] Called with:', { tourId });
  try {
    const snap = await adminDb.collection('tours').doc(tourId).collection('tourPricing')
      .where('isActive', '==', true).orderBy('sortOrder', 'asc').get();
    const pricingResult = serializeDocs(snap).map(tier => ({ ...tier, prepaid: tier.prepaid ?? 50 }));
    logger.log('[getTourPricing] Result:', { count: pricingResult.length });
    return pricingResult;
  } catch (error) {
    logger.error('[getTourPricing] Error:', error.message);
    logger.log('[getTourPricing] Result: empty (error)');
    return [];
  }
}

/**
 * Fetch reviews for a tour by slug.
 * @param {string} slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getTourReviews(slug) {
  logger.log('[getTourReviews] Called with:', { slug });
  try {
    const tour = await getDocBySlug('tours', slug);
    if (!tour) return { reviews: [], totalRating: 0, avgRating: 0 };
    const { reviews } = await getReviews('tour', tour.id);
    const totalRating = reviews.length;
    const avgRating = totalRating > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating : 0;
    logger.log('[getTourReviews] Result:', { count: reviews.length, avgRating });
    return { reviews, totalRating, avgRating };
  } catch (error) {
    logger.error('[getTourReviews] Error:', error.message);
    logger.log('[getTourReviews] Result: empty (error)');
    return { reviews: [], totalRating: 0, avgRating: 0 };
  }
}

// ─── Hotels ──────────────────────────────────────────────────────────

/**
 * Fetch hotels with pagination.
 * @returns {Promise<{hotels: Object[], lastVisible: Object|null}>}
 */
export async function getHotels({ pageSize = 12, cursor = null } = {}) {
  logger.log('[getHotels] Called with:', { pageSize, cursor: cursor ? '<cursor>' : null });
  try {
    let q = hotelsCol().orderBy('createdAt', 'desc').limit(pageSize);
    if (cursor) q = hotelsCol().orderBy('createdAt', 'desc').startAfter(cursor).limit(pageSize);
    const snap = await q.get();
    const hotelsResult = { hotels: serializeDocs(snap).map(h => ({ ...h, pricing: { ...(h.pricing || {}), prepaid: h.pricing?.prepaid ?? 100 } })), lastVisible: snap.docs[snap.docs.length - 1] || null };
    logger.log('[getHotels] Result:', { count: hotelsResult.hotels.length, hasMore: !!hotelsResult.lastVisible });
    return hotelsResult;
  } catch (error) {
    logger.error('[getHotels] Error:', error.message);
    logger.log('[getHotels] Result: empty (error)');
    return { hotels: [], lastVisible: null };
  }
}

/**
 * Search hotels with filters.
 * Only uses 1 Firestore `where` (locationId), rest handled in-memory.
 * @param {Object} filters
 * @returns {Promise<{hotels: Object[], lastVisible: Object|null}>}
 */
export async function searchHotels(filters = {}) {
  const { locationId, starRating, amenities, pageSize = 12, page = 1, cursor } = filters;
  logger.log('[searchHotels] Called with:', { locationId, starRating, amenities, pageSize, page, hasCursor: !!filters.cursor });
  try {
    // Fetch extra docs to compensate for in-memory filtering (star, amenities)
    const fetchLimit = cursor ? pageSize : pageSize * 3;
    let q = hotelsCol();
    if (locationId) q = q.where('address.cityId', '==', locationId);
    q = q.orderBy('createdAt', 'desc').limit(fetchLimit);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    let hotels = serializeDocs(snap);

    if (starRating) {
      const minStar = Number(starRating);
      hotels = hotels.filter((h) => (h.starRating || 0) >= minStar);
    }
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : amenities.split(',').map((a) => a.trim()).filter(Boolean);
      if (amenityList.length > 0) {
        hotels = hotels.filter((h) => {
          const ha = h.amenities || [];
          return amenityList.some((a) => ha.some((item) => item.toLowerCase().includes(a.toLowerCase())));
        });
      }
    }

    if (!cursor) {
      const startIdx = (page - 1) * pageSize;
      hotels = hotels.slice(startIdx, startIdx + pageSize);
    }
    logger.log('[searchHotels] Result:', { count: hotels.length, hasMore: !!snap.docs[snap.docs.length - 1] });
    return { hotels, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    logger.error('[searchHotels] Error:', error.message);
    try {
      const snap = await hotelsCol().orderBy('createdAt', 'desc').limit(pageSize).get();
      return { hotels: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
    } catch {
      logger.log('[searchHotels] Result: empty (fallback error)');
      return { hotels: [], lastVisible: null };
    }
  }
}

/**
 * Count hotels with optional in-memory filtering for starRating and amenities.
 * Price filters (minPrice/maxPrice) are ignored in the count since price data
 * lives in a separate collection (hotel_price_schedules).
 * @param {{ locationId?: string, starRating?: string, amenities?: string, minPrice?: number|null, maxPrice?: number|null }} filters
 * @returns {Promise<number>}
 */
export async function countHotels(filters = {}) {
  logger.log('[countHotels] Called with:', { filters });
  const key = _cacheKey('countHotels', filters);
  const cached = _cacheGet(key);
  if (cached !== undefined) {
    logger.log('[countHotels] Result: cached', { count: cached });
    return cached;
  }

  const { locationId, starRating, amenities } = filters;

  // Simple case: no in-memory filters — use Firestore aggregation query
  if (!starRating && !amenities) {
    try {
      let q = hotelsCol();
      if (locationId) q = q.where('address.cityId', '==', locationId);
      const snap = await q.count().get();
      const count = snap.data().count;
      _cacheSet(key, count, CACHE_TTL.COUNTS);
      return count;
    } catch (error) {
      logger.error('[countHotels] count() failed, falling back to manual count:', error.message);
      try {
        let q = hotelsCol();
        if (locationId) q = q.where('address.cityId', '==', locationId);
        const snap = await q.get();
        const count = snap.size;
        _cacheSet(key, count, CACHE_TTL.COUNTS);
        return count;
      } catch (fallbackError) {
        logger.error('[countHotels] Fallback also failed:', fallbackError.message);
        logger.log('[countHotels] Result: 0 (fallback error)');
        return 0;
      }
    }
  }

  // Complex case: apply starRating/amenities in-memory
  try {
    let q = hotelsCol();
    if (locationId) q = q.where('address.cityId', '==', locationId);
    const snap = await q.get();
    let docs = serializeDocs(snap);

    if (starRating) {
      const minStar = Number(starRating);
      docs = docs.filter((h) => (h.starRating || 0) >= minStar);
    }

    if (amenities) {
      const amenityList = amenities.split(',').map((a) => a.trim()).filter(Boolean);
      if (amenityList.length > 0) {
        docs = docs.filter((h) => {
          const ha = h.amenities || [];
          return amenityList.every((a) => ha.some((item) => item.toLowerCase().includes(a.toLowerCase())));
        });
      }
    }

    const count = docs.length;
    _cacheSet(key, count, CACHE_TTL.COUNTS);
    return count;
  } catch (error) {
    logger.error('[countHotels] Complex count failed, falling back to manual count:', error.message);
    try {
      let q = hotelsCol();
      if (locationId) q = q.where('address.cityId', '==', locationId);
      const snap = await q.get();
      const count = snap.size;
      _cacheSet(key, count, CACHE_TTL.COUNTS);
      return count;
    } catch (fallbackError) {
      logger.error('[countHotels] Fallback also failed:', fallbackError.message);
      logger.log('[countHotels] Result: 0 (fallback error)');
      return 0;
    }
  }
}

/**
 * Fetch featured hotels.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedHotels(count = 6) {
  logger.log('[getFeaturedHotels] Called with:', { count });
  try {
    const snap = await hotelsCol().where('isFeatured', '==', true).orderBy('createdAt', 'desc').limit(count).get();
    const result = serializeDocs(snap);
    logger.log('[getFeaturedHotels] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getFeaturedHotels] Error:', error.message);
    logger.log('[getFeaturedHotels] Result: empty (error)');
    return [];
  }
}

/**
 * Fetch a single hotel by slug.
 * @param {string} slug
 * @returns {Promise<{hotel: Object|null}>}
 */
export async function getHotelBySlug(slug) {
  logger.log('[getHotelBySlug] Called with:', { slug });
  try {
    const snap = await hotelsCol().where('slug', '==', slug).limit(1).get();
    if (snap.empty) {
      logger.log('[getHotelBySlug] Result: null (not found)');
      return { hotel: null };
    }
    const hotelResult = serializeSnap(snap.docs[0]);
    logger.log('[getHotelBySlug] Result:', { id: hotelResult?.id, slug });
    return { hotel: hotelResult };
  } catch (error) {
    logger.error('[getHotelBySlug] Error:', error.message);
    logger.log('[getHotelBySlug] Result: null (error)');
    return { hotel: null };
  }
}

/**
 * Fetch related hotels by location.
 * @param {string} currentSlug
 * @param {string} locationId
 * @param {number} count
 * @returns {Promise<{hotels: Object[]}>}
 */
export async function getRelatedHotels(currentSlug, locationId, count = 3) {
  logger.log('[getRelatedHotels] Called with:', { currentSlug, locationId, count });
  if (!locationId) return { hotels: [] };
  try {
    const snap = await hotelsCol().where('address.cityId', '==', locationId).limit(count + 10).get();
    let hotels = serializeDocs(snap).filter((h) => h.slug !== currentSlug);
    hotels.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    hotels = hotels.slice(0, count);
    logger.log('[getRelatedHotels] Result:', { count: hotels.length });
    return { hotels };
  } catch (error) {
    logger.error('[getRelatedHotels] Error:', error.message);
    logger.log('[getRelatedHotels] Result: empty (error)');
    return { hotels: [] };
  }
}

/**
 * Fetch reviews for a hotel by slug.
 * @param {string} slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getHotelReviews(slug) {
  logger.log('[getHotelReviews] Called with:', { slug });
  try {
    const hotel = await getDocBySlug('hotels', slug);
    if (!hotel) return { reviews: [], totalRating: 0, avgRating: 0 };
    const { reviews } = await getReviews('hotel', hotel.id);
    const totalRating = reviews.length;
    const avgRating = totalRating > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating : hotel.rating?.average || 0;
    return { reviews, totalRating, avgRating };
  } catch (error) {
    logger.error('[getHotelReviews] Error:', error.message);
    try {
      const hotel = await getDocBySlug('hotels', slug);
      if (!hotel) return { reviews: [], totalRating: 0, avgRating: 0 };
      logger.log('[getHotelReviews] Result: fallback rating');
    return { reviews: [], totalRating: hotel.rating?.count || 0, avgRating: hotel.rating?.average || 0 };
    } catch {
      logger.log('[getHotelReviews] Result: empty (fallback error)');
      return { reviews: [], totalRating: 0, avgRating: 0 };
    }
  }
}

// ─── Hotels v4: Embedded Rooms + Hotel Price Schedules ───────────────

/**
 * Fetch a hotel price schedule.
 * @param {string} hotelId
 * @param {number} [year]
 * @returns {Promise<Object|null>}
 */
export async function getHotelPriceSchedule(hotelId, year = new Date().getFullYear()) {
  logger.log('[getHotelPriceSchedule] Called with:', { hotelId, year });
  try {
    const docId = `${hotelId}_base_${year}`;
    const snap = await adminDb.collection('hotel_price_schedules').doc(docId).get();
    if (!snap.exists) return null;
    const data = serializeSnap(snap);
    if (data.info?.hotelId !== hotelId || data.info?.year !== year || data.info?.status !== 'active') {
      logger.log('[getHotelPriceSchedule] Result: null (inactive/mismatch)');
      return null;
    }
    logger.log('[getHotelPriceSchedule] Result:', { hotelId, year, status: data.info?.status });
    return data;
  } catch (error) {
    logger.error('[getHotelPriceSchedule] Error:', error.message);
    logger.log('[getHotelPriceSchedule] Result: null (error)');
    return null;
  }
}

/**
 * Resolve pricing for a room on a date from a price schedule.
 * @param {Object} priceSchedule
 * @param {string} roomId
 * @param {string} date YYYY-MM-DD
 * @returns {Array}
 */
export function resolveRoomPricing(priceSchedule, roomId, date) {
  logger.log('[resolveRoomPricing] Called with:', { roomId, date });
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
        result.push({
          rateType,
          costPrice: Number(pricing.costPrice) || 0,
          sellPrice: Number(pricing.sellPrice) || 0,
          startDate: pricing.startDate,
          endDate: pricing.endDate,
          supplier: pricing.supplier || '',
          periodKey,
          prepaid: Number(pricing.prepaid) || 100,
        });
      }
    }
  }
  result.sort((a, b) => a.sellPrice - b.sellPrice);
  return result;
}

/**
 * Get the lowest sell price for a room on a date.
 * @param {Object} priceSchedule
 * @param {string} roomId
 * @param {string} date YYYY-MM-DD
 * @returns {number}
 */
export function getLowestRoomPrice(priceSchedule, roomId, date) {
  logger.log('[getLowestRoomPrice] Called with:', { roomId, date });
  const pricing = resolveRoomPricing(priceSchedule, roomId, date);
  return pricing.length === 0 ? 0 : pricing[0].sellPrice;
}

/**
 * Get the lowest price across all rooms for a date.
 * @param {Object} priceSchedule
 * @param {Array} rooms
 * @param {string} date YYYY-MM-DD
 * @returns {number}
 */
export function getHotelLowestPrice(priceSchedule, rooms, date) {
  logger.log('[getHotelLowestPrice] Called with:', { roomCount: rooms?.length, date });
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
 * Build pricing table for hotel detail page.
 * @param {Object} priceSchedule
 * @param {Array} rooms
 * @param {string} checkIn YYYY-MM-DD
 * @param {string} checkOut YYYY-MM-DD
 * @returns {Array}
 */
export function buildRoomPricingTable(priceSchedule, rooms, checkIn, checkOut) {
  logger.log('[buildRoomPricingTable] Called with:', { checkIn, checkOut });
  try {
    const roomsArr = Array.isArray(rooms) ? rooms : (rooms ? Object.values(rooms) : []);
    if (roomsArr.length === 0) return [];

    const sortedRooms = [...roomsArr].sort((a, b) => {
      const orderA = a?.sortOrder ?? 999;
      const orderB = b?.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a?.name || '').localeCompare(b?.name || '');
    });

    const ci = new Date(checkIn);
    const co = new Date(checkOut);

    function buildRoomRow(room, dates) {
      if (!room) return null;
      if (!room.isActive) {
        return {
          roomId: room.id, roomName: room.name, totalRooms: room.totalRooms || 0, maxGuests: room.maxGuests || 0,
          bedType: room.bedType || '', roomSize: room.roomSize || 0, description: room.description || '',
          amenities: room.amenities || [], included: room.included || [], featuredImage: room.featuredImage || '',
          gallery: room.gallery || [], isActive: false, sortOrder: room.sortOrder ?? 999, rateTypes: [],
        };
      }
      const rateTypeMap = {};
      for (const date of (dates || [])) {
        const pricing = resolveRoomPricing(priceSchedule, room.id, date) || [];
        for (const p of pricing) {
          if (!rateTypeMap[p.rateType]) rateTypeMap[p.rateType] = { rateType: p.rateType, dailyPrices: [], avgSellPrice: 0 };
          rateTypeMap[p.rateType].dailyPrices.push({ date, sellPrice: p.sellPrice || 0, costPrice: p.costPrice || 0 });
        }
      }
      const rateTypes = Object.values(rateTypeMap).map((rt) => {
        rt.avgSellPrice = rt.dailyPrices.reduce((s, d) => s + (d.sellPrice || 0), 0) / (rt.dailyPrices.length || 1);
        return rt;
      });
      return {
        roomId: room.id, roomName: room.name, totalRooms: room.totalRooms || 0, maxGuests: room.maxGuests || 0,
        bedType: room.bedType || '', roomSize: room.roomSize || 0, description: room.description || '',
        amenities: room.amenities || [], included: room.included || [], featuredImage: room.featuredImage || '',
        gallery: room.gallery || [], isActive: true, sortOrder: room.sortOrder ?? 999, rateTypes,
      };
    }

    const dates = [];
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    if (dates.length === 0) dates.push(checkIn);

    return sortedRooms.map((room) => buildRoomRow(room, dates)).filter(Boolean);
  } catch (error) {
    logger.error('[firestore-admin] Error in buildRoomPricingTable:', error);
    return [];
  }
}

/**
 * Enrich hotels with lowest price from hotel_price_schedules.
 * @param {Object[]} hotels
 * @returns {Promise<Object[]>}
 */
export async function enrichHotelsWithLowestPrices(hotels) {
  logger.log('[enrichHotelsWithLowestPrices] Called with:', { count: hotels?.length });
  if (!hotels || hotels.length === 0) {
    logger.log('[enrichHotelsWithLowestPrices] Result: empty input');
    return hotels;
  }
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const results = await Promise.allSettled(
    hotels.map(async (hotel) => {
      if (!hotel.id) return { hotel, lowestPrice: 0 };
      const schedule = await getHotelPriceSchedule(hotel.id, currentYear);
      if (!schedule) return { hotel, lowestPrice: hotel.pricing?.basePrice || 0 };
      const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : (hotel.rooms ? Object.values(hotel.rooms) : []);
      const lowest = getHotelLowestPrice(schedule, rooms, today);
      return { hotel, lowestPrice: lowest > 0 ? lowest : (hotel.pricing?.basePrice || 0) };
    })
  );
  for (const result of results) {
    if (result.status === 'fulfilled') result.value.hotel.lowestPrice = result.value.lowestPrice;
  }
  logger.log('[enrichHotelsWithLowestPrices] Result:', { count: hotels.length });
  return hotels;
}

// ─── Activities ──────────────────────────────────────────────────────

/**
 * Fetch activities with pagination.
 * @returns {Promise<{activities: Object[], lastVisible: Object|null}>}
 */
export async function getActivitiesList({ pageSize = 12, cursor = null } = {}) {
  logger.log('[getActivitiesList] Called with:', { pageSize, cursor: cursor ? '<cursor>' : null });
  try {
    let q = activitiesCol().orderBy('createdAt', 'desc').limit(pageSize);
    if (cursor) q = activitiesCol().orderBy('createdAt', 'desc').startAfter(cursor).limit(pageSize);
    const snap = await q.get();
    const activitiesResult = { activities: serializeDocs(snap).map(a => ({ ...a, pricing: { ...(a.pricing || {}), prepaid: a.pricing?.prepaid ?? 0 } })), lastVisible: snap.docs[snap.docs.length - 1] || null };
    logger.log('[getActivitiesList] Result:', { count: activitiesResult.activities.length, hasMore: !!activitiesResult.lastVisible });
    return activitiesResult;
  } catch (error) {
    logger.error('[getActivitiesList] Error:', error.message);
    logger.log('[getActivitiesList] Result: empty (error)');
    return { activities: [], lastVisible: null };
  }
}

/**
 * Search activities with filters.
 * @param {Object} filters
 * @returns {Promise<{activities: Object[], totalCount: number, lastVisible: Object|null}>}
 */
export async function searchActivities(filters = {}) {
  const { locationId, categoryId, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, page = 1, cursor } = filters;
  logger.log('[searchActivities] Called with:', { locationId, categoryId, minPrice, maxPrice, sortBy, pageSize, page, hasCursor: !!filters.cursor });
  try {
    let q = activitiesCol();
    if (locationId) q = q.where('locationId', '==', locationId);
    if (categoryId) q = q.where('categories', 'array-contains', categoryId);

    let countQ = activitiesCol();
    if (locationId) countQ = countQ.where('locationId', '==', locationId);
    if (categoryId) countQ = countQ.where('categories', 'array-contains', categoryId);
    const countSnap = await countQ.count().get();
    const totalCount = countSnap.data().count;

    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.basePrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.basePrice', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }

    // Fetch enough items to cover requested page when using offset-based pagination
    const limit = page > 1 && !cursor ? page * pageSize : pageSize;
    q = q.limit(limit);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    let activities = serializeDocs(snap).map(a => ({ ...a, pricing: { ...(a.pricing || {}), prepaid: a.pricing?.prepaid ?? 0 } }));

    // Client-side price filtering — Firestore requires composite indexes for
    // range filters on different fields combined with ordering, so we filter
    // in JS. This means totalCount may be slightly off when price filters are active.
    if (minPrice != null && minPrice !== '') activities = activities.filter((a) => a.pricing?.basePrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') activities = activities.filter((a) => a.pricing?.basePrice <= Number(maxPrice));

    // Slice for current page when using limit-based pagination without cursor
    if (page > 1 && !cursor) {
      activities = activities.slice((page - 1) * pageSize, page * pageSize);
    }

    logger.log('[searchActivities] Result:', { count: activities.length, totalCount, hasMore: !!snap.docs[snap.docs.length - 1] });
    return { activities, totalCount, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    logger.error('[searchActivities] Error:', error.message);
    logger.log('[searchActivities] Result: empty (error)');
    return { activities: [], totalCount: 0, lastVisible: null };
  }
}

/**
 * Fetch a single activity by slug.
 * @param {string} slug
 * @returns {Promise<{activity: Object|null}>}
 */
export async function getActivityBySlug(slug) {
  logger.log('[getActivityBySlug] Called with:', { slug });
  try {
    const activity = await getDocBySlug('activities', slug);
    if (activity) activity.pricing = { ...(activity.pricing || {}), prepaid: activity.pricing?.prepaid ?? 0 };
    logger.log('[getActivityBySlug] Result:', { found: !!activity, slug });
    return { activity };
  } catch (error) {
    logger.error('[getActivityBySlug] Error:', error.message);
    logger.log('[getActivityBySlug] Result: null (error)');
    return { activity: null };
  }
}

/**
 * Fetch related activities (same location, excluding current).
 * @param {string} slug
 * @param {number} [count=4]
 * @returns {Promise<{activities: Object[]}>}
 */
export async function getRelatedActivities(slug, count = 4) {
  logger.log('[getRelatedActivities] Called with:', { slug, count });
  try {
    const activity = await getDocBySlug('activities', slug);
    if (!activity || !activity.locationId) return { activities: [] };
    const snap = await activitiesCol().where('locationId', '==', activity.locationId).orderBy('createdAt', 'desc').limit(count * 2).get();
    const activities = serializeDocs(snap).filter((a) => a.id !== activity.id).slice(0, count).map(a => ({ ...a, pricing: { ...(a.pricing || {}), prepaid: a.pricing?.prepaid ?? 0 } }));
    logger.log('[getRelatedActivities] Result:', { count: activities.length });
    return { activities };
  } catch (error) {
    logger.error('[getRelatedActivities] Error:', error.message);
    logger.log('[getRelatedActivities] Result: empty (error)');
    return { activities: [] };
  }
}

// ─── Cars ────────────────────────────────────────────────────────────

/**
 * Search cars with filters.
 * @param {Object} filters
 * @returns {Promise<{cars: Object[], lastVisible: Object|null}>}
 */
export async function searchCars(filters = {}) {
  const { carType, transmission, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, page = 1, cursor } = filters;
  logger.log('[searchCars] Called with:', { carType, transmission, minPrice, maxPrice, sortBy, pageSize, page, hasCursor: !!filters.cursor });
  try {
    const limitVal = cursor ? pageSize : (page > 1 ? page * pageSize : pageSize);
    let q = carsCol();
    if (carType) q = q.where('carType', '==', carType);
    if (transmission) q = q.where('transmission', '==', transmission);
    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.basePrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.basePrice', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }
    q = q.limit(limitVal);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    let cars = serializeDocs(snap).map(c => ({ ...c, pricing: { ...(c.pricing || {}), prepaid: c.pricing?.prepaid ?? 0 } }));
    if (minPrice != null && minPrice !== '') cars = cars.filter((c) => c.pricing?.basePrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') cars = cars.filter((c) => c.pricing?.basePrice <= Number(maxPrice));
    if (!cursor) {
      const startIdx = (page - 1) * pageSize;
      cars = cars.slice(startIdx, startIdx + pageSize);
    }
    logger.log('[searchCars] Result:', { count: cars.length, hasMore: !!snap.docs[snap.docs.length - 1] });
    return { cars, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    logger.error('[searchCars] Error:', error.message);
    try {
      const snap = await carsCol().orderBy('createdAt', 'desc').limit(cursor ? pageSize : (page > 1 ? page * pageSize : pageSize)).get();
      return { cars: serializeDocs(snap).map(c => ({ ...c, pricing: { ...(c.pricing || {}), prepaid: c.pricing?.prepaid ?? 0 } })), lastVisible: snap.docs[snap.docs.length - 1] || null };
    } catch {
      logger.log('[searchCars] Result: empty (fallback error)');
      return { cars: [], lastVisible: null };
    }
  }
}

/**
 * Count cars (by carType/transmission only).
 * @param {{ carType?: string, transmission?: string }} filters
 * @returns {Promise<number>}
 */
export async function countCars(filters = {}) {
  logger.log('[countCars] Called with:', { filters });
  const { carType, transmission } = filters;
  try {
    let q = carsCol();
    if (carType) q = q.where('carType', '==', carType);
    if (transmission) q = q.where('transmission', '==', transmission);
    const snap = await q.count().get();
    const count = snap.data().count;
    logger.log('[countCars] Result:', { count });
    return count;
  } catch (error) {
    logger.error('[countCars] Error:', error.message);
    logger.log('[countCars] Result: 0 (error)');
    return 0;
  }
}

// ─── Rentals ─────────────────────────────────────────────────────────

/**
 * Search rentals with filters.
 * @param {Object} filters
 * @returns {Promise<{rentals: Object[], lastVisible: Object|null}>}
 */
export async function searchRentals(filters = {}) {
  const { type, locationId, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, page = 1, cursor } = filters;
  logger.log('[searchRentals] Called with:', { type, locationId, minPrice, maxPrice, sortBy, pageSize, page, hasCursor: !!filters.cursor });
  try {
    const limitVal = cursor ? pageSize : (page > 1 ? page * pageSize : pageSize);
    let q = rentalsCol();
    if (type) q = q.where('type', '==', type);
    if (locationId) q = q.where('locationId', '==', locationId);
    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.basePrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.basePrice', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }
    q = q.limit(limitVal);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    let rentals = serializeDocs(snap).map(r => ({ ...r, pricing: { ...(r.pricing || {}), prepaid: r.pricing?.prepaid ?? 0 } }));
    if (minPrice != null && minPrice !== '') rentals = rentals.filter((r) => r.pricing?.basePrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') rentals = rentals.filter((r) => r.pricing?.basePrice <= Number(maxPrice));
    if (!cursor) {
      const startIdx = (page - 1) * pageSize;
      rentals = rentals.slice(startIdx, startIdx + pageSize);
    }
    logger.log('[searchRentals] Result:', { count: rentals.length, hasMore: !!snap.docs[snap.docs.length - 1] });
    return { rentals, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    logger.error('[searchRentals] Error:', error.message);
    try {
      const snap = await rentalsCol().orderBy('createdAt', 'desc').limit(cursor ? pageSize : (page > 1 ? page * pageSize : pageSize)).get();
      return { rentals: serializeDocs(snap).map(r => ({ ...r, pricing: { ...(r.pricing || {}), prepaid: r.pricing?.prepaid ?? 0 } })), lastVisible: snap.docs[snap.docs.length - 1] || null };
    } catch {
      logger.log('[searchRentals] Result: empty (fallback error)');
      return { rentals: [], lastVisible: null };
    }
  }
}

/**
 * Count rentals (by type/locationId only).
 * @param {{ type?: string, locationId?: string }} filters
 * @returns {Promise<number>}
 */
export async function countRentals(filters = {}) {
  logger.log('[countRentals] Called with:', { filters });
  const { type, locationId } = filters;
  try {
    let q = rentalsCol();
    if (type) q = q.where('type', '==', type);
    if (locationId) q = q.where('locationId', '==', locationId);
    const snap = await q.count().get();
    const count = snap.data().count;
    logger.log('[countRentals] Result:', { count });
    return count;
  } catch (error) {
    logger.error('[countRentals] Error:', error.message);
    logger.log('[countRentals] Result: 0 (error)');
    return 0;
  }
}

// ─── Locations ───────────────────────────────────────────────────────

/**
 * Fetch all locations.
 * @returns {Promise<Object[]>}
 */
export async function getLocations() {
  logger.log('[getLocations] Called');
  const cached = _cacheGet('locations:all');
  if (cached !== undefined) {
    logger.log('[getLocations] Result: cached', { count: cached.length });
    return cached;
  }

  try {
    const snap = await locationsCol().orderBy('name', 'asc').get();
    const result = serializeDocs(snap);
    _cacheSet('locations:all', result, CACHE_TTL.LOCATIONS);
    logger.log('[getLocations] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getLocations] Error:', error.message);
    logger.log('[getLocations] Result: empty (error)');
    return [];
  }
}

/**
 * Fetch featured locations.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedLocations(count = 8) {
  logger.log('[getFeaturedLocations] Called with:', { count });
  try {
    const snap = await locationsCol().where('isFeatured', '==', true).limit(count).get();
    const result = serializeDocs(snap);
    logger.log('[getFeaturedLocations] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getFeaturedLocations] Error:', error.message);
    logger.log('[getFeaturedLocations] Result: empty (error)');
    return [];
  }
}

/**
 * Fetch location by slug.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getLocationBySlug(slug) {
  logger.log('[getLocationBySlug] Called with:', { slug });
  try {
    const result = await getDocBySlug('locations', slug);
    logger.log('[getLocationBySlug] Result:', { found: !!result, slug });
    return result;
  } catch (error) {
    logger.error('[getLocationBySlug] Error:', error.message);
    logger.log('[getLocationBySlug] Result: null (error)');
    return null;
  }
}

// ─── Bookings ────────────────────────────────────────────────────────

/**
 * Get a booking by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getBookingById(id) {
  logger.log('[getBookingById] Called with:', { id });
  return getDocById('bookings', id);
}

/**
 * Fetch bookings for a user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserBookings(userId) {
  logger.log('[getUserBookings] Called with:', { userId });
  try {
    const snap = await bookingsCol().where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const result = serializeDocs(snap);
    logger.log('[getUserBookings] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getUserBookings] Error:', error.message);
    logger.log('[getUserBookings] Result: empty (error)');
    return [];
  }
}

// ─── Reviews ─────────────────────────────────────────────────────────

/**
 * Fetch reviews for a service.
 * @param {string} serviceType
 * @param {string} serviceId
 * @param {{ pageSize?: number, cursor?: Object }} options
 * @returns {Promise<{reviews: Object[], lastVisible: Object|null}>}
 */
export async function getReviews(serviceType, serviceId, { pageSize = 10, cursor = null } = {}) {
  logger.log('[getReviews] Called with:', { serviceType, serviceId, pageSize, hasCursor: !!cursor });
  try {
    let q = reviewsCol()
      .where('serviceType', '==', serviceType)
      .where('serviceId', '==', serviceId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc');
    q = cursor ? q.startAfter(cursor).limit(pageSize) : q.limit(pageSize);
    const snap = await q.get();
    const reviewsResult = { reviews: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
    logger.log('[getReviews] Result:', { count: reviewsResult.reviews.length, hasMore: !!reviewsResult.lastVisible });
    return reviewsResult;
  } catch (error) {
    logger.error('[getReviews] Error:', error.message);
    logger.log('[getReviews] Result: empty (error)');
    return { reviews: [], lastVisible: null };
  }
}

/**
 * Fetch reviews written by a user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserReviews(userId) {
  logger.log('[getUserReviews] Called with:', { userId });
  try {
    const snap = await reviewsCol().where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const result = serializeDocs(snap);
    logger.log('[getUserReviews] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getUserReviews] Error:', error.message);
    logger.log('[getUserReviews] Result: empty (error)');
    return [];
  }
}

// ─── Users ───────────────────────────────────────────────────────────

/**
 * Fetch user profile by Firebase Auth UID.
 * Queries by the `uid` field inside the document (sequential ID pattern),
 * with legacy fallback to direct doc-by-UID lookup for pre-migration users.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  logger.log('[getUserProfile] Called with:', { uid });
  try {
    const snap = await usersCol().where('uid', '==', uid).limit(1).get();
    if (!snap.empty) {
      const profileResult = serializeSnap(snap.docs[0]);
      logger.log('[getUserProfile] Result:', { found: true, uid });
      return profileResult;
    }
    // Legacy fallback: doc ID might still be Auth UID (pre-migration)
    const fallbackResult = await getDocById('users', uid);
    logger.log('[getUserProfile] Result:', { found: !!fallbackResult, uid });
    return fallbackResult;
  } catch (error) {
    logger.error('[getUserProfile] Error:', error.message);
    logger.log('[getUserProfile] Result: null (error)');
    return null;
  }
}

/**
 * Fetch detailed wishlist items for a user.
 * @param {string} uid
 * @returns {Promise<Object[]>}
 */
export async function getUserWishlist(uid) {
  logger.log('[getUserWishlist] Called with:', { uid });
  const userProfile = await getUserProfile(uid);
  if (!userProfile || !userProfile.wishlist || userProfile.wishlist.length === 0) {
    logger.log('[getUserWishlist] Result: empty (no wishlist)');
    return [];
  }

  const detailPromises = userProfile.wishlist.map(async (itemId) => {
    const collections = ['tours', 'hotels', 'activities'];
    for (const col of collections) {
      const item = await getDocById(col, itemId);
      if (item) return { ...item, type: col.replace(/s$/, '') };
    }
    return null;
  });
  const results = await Promise.all(detailPromises);
  const filtered = results.filter((item) => item !== null);
  logger.log('[getUserWishlist] Result:', { count: filtered.length });
  return filtered;
}

// ─── Coupons ─────────────────────────────────────────────────────────

/**
 * Validate a coupon code.
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
export async function validateCoupon(code) {
  logger.log('[validateCoupon] Called with:', { code });
  try {
    const snap = await couponsCol().where('code', '==', code).where('status', '==', 'active').limit(1).get();
    if (snap.empty) return null;
    const coupon = serializeSnap(snap.docs[0]);
    if (coupon.expireDate && new Date(coupon.expireDate) < new Date()) return null;
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return null;
    return coupon;
  } catch (error) {
    logger.error('[validateCoupon] Error:', error.message);
    logger.log('[validateCoupon] Result: null (error)');
    return null;
  }
}

// ─── Inventory Hold ──────────────────────────────────────────────────

/**
 * Resolve the Firestore collection reference for a service type.
 * @param {string} serviceType
 * @returns {FirebaseFirestore.CollectionReference}
 */
function getCollectionRef(serviceType) {
  switch (serviceType) {
    case 'hotel':
    case 'hotel_room':
      return hotelsCol();
    case 'tour':
      return toursCol();
    case 'activity':
      return activitiesCol();
    case 'car':
      return carsCol();
    case 'rental':
      return rentalsCol();
    default:
      return toursCol();
  }
}

/**
 * Check real-time availability considering bookings and active holds.
 * @param {string} serviceId
 * @param {string} serviceType
 * @param {*} startDate
 * @param {number} totalCapacity
 * @returns {Promise<number>}
 * @deprecated Use getRealAvailabilityAdmin() instead — reads availability field directly.
 */
export async function getRealAvailability(serviceId, serviceType, startDate, totalCapacity) {
  logger.log('[getRealAvailability] Called with:', { serviceId, serviceType, startDate, totalCapacity });
  try {
    const bookingsSnap = await bookingsCol()
      .where('serviceId', '==', serviceId)
      .where('startDate', '==', startDate)
      .where('status', '==', 'confirmed')
      .get();
    const bookedCount = bookingsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

    const now = new Date();
    const holdsSnap = await inventoryHoldsCol()
      .where('serviceId', '==', serviceId)
      .where('startDate', '==', startDate)
      .where('expiresAt', '>', now)
      .get();
    const heldCount = holdsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

    const availResult = Math.max(0, totalCapacity - bookedCount - heldCount);
    logger.log('[getRealAvailability] Result:', { available: availResult });
    return availResult;
  } catch (error) {
    logger.error('[getRealAvailability] Error:', error.message);
    logger.log('[getRealAvailability] Result: fallback to totalCapacity', { totalCapacity });
    return totalCapacity;
  }
}

/**
 * Read availability directly from the service document's field (Single Source of Truth).
 * @param {string} serviceId
 * @param {string} serviceType - 'hotel' | 'hotel_room' | 'tour' | 'activity' | 'car' | 'rental'
 * @param {*} startDate - Kept for API compatibility; not used for field-based reads
 * @param {string} [roomId] - Required for hotel_room
 * @returns {Promise<number>}
 */
export async function getRealAvailabilityAdmin(serviceId, serviceType, startDate, roomId) {
  logger.log('[getRealAvailabilityAdmin] Called with:', { serviceId, serviceType, startDate, roomId });
  try {
    const col = getCollectionRef(serviceType);
    const snap = await col.doc(serviceId).get();
    if (!snap.exists) return 0;
    const data = snap.data();

    if (serviceType === 'hotel' || serviceType === 'hotel_room') {
      if (!roomId) return 0;
      const rooms = data.rooms || {};
      let roomData;
      if (Array.isArray(rooms)) {
        roomData = rooms.find(r => r.roomId === roomId || r.id === roomId);
      } else {
        roomData = rooms[roomId];
      }
      if (!roomData) return 0;
      return Math.max(0, roomData.availability ?? roomData.totalRooms ?? 1);
    }

    // Tours, activities, cars, rentals — read root availability field
    const availResult = Math.max(0, data.availability ?? data.capacity ?? 100);
    logger.log('[getRealAvailabilityAdmin] Result:', { available: availResult });
    return availResult;
  } catch (error) {
    logger.error('[getRealAvailabilityAdmin] Error:', error.message);
    logger.log('[getRealAvailabilityAdmin] Result: 0 (error)');
    return 0;
  }
}

/**
 * Create an inventory hold and atomically decrement availability.
 * @param {string} serviceId
 * @param {string} serviceType
 * @param {*} startDate
 * @param {*} endDate
 * @param {number} quantity
 * @param {string} userId
 * @param {string} [roomId] - Required for hotel_room
 * @returns {Promise<string|null>} Hold document ID or null on failure
 */
export async function createInventoryHoldAdmin(serviceId, serviceType, startDate, endDate, quantity, userId, roomId) {
  try {
    const col = getCollectionRef(serviceType);
    const serviceRef = col.doc(serviceId);
    const holdRef = inventoryHoldsCol().doc();

    await adminDb.runTransaction(async (tx) => {
      // Create hold document
      tx.set(holdRef, {
        serviceId,
        serviceType,
        startDate,
        endDate,
        quantity,
        userId,
        heldAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Atomically decrement availability
      if (serviceType === 'hotel' || serviceType === 'hotel_room') {
        if (roomId) {
          const docSnap = await tx.get(serviceRef);
          if (docSnap.exists) {
            const data = docSnap.data();
            const rooms = data.rooms || {};
            if (Array.isArray(rooms)) {
              const idx = rooms.findIndex(r => r.roomId === roomId || r.id === roomId);
              if (idx !== -1) {
                const current = rooms[idx].availability ?? rooms[idx].totalRooms ?? 0;
                rooms[idx] = { ...rooms[idx], availability: Math.max(0, current - quantity) };
                tx.update(serviceRef, { rooms });
              }
            } else {
              tx.update(serviceRef, `rooms.${roomId}.availability`, admin.firestore.FieldValue.increment(-quantity));
            }
          }
        }
      } else {
        tx.update(serviceRef, 'availability', admin.firestore.FieldValue.increment(-quantity));
      }
    });

    return holdRef.id;
  } catch (error) {
    console.error('[createInventoryHoldAdmin] Error:', error.message);
    return null;
  }
}

/**
 * Release an inventory hold and atomically restore availability.
 * @param {string} holdId
 * @returns {Promise<boolean>}
 */
export async function releaseInventoryHoldAdmin(holdId) {
  try {
    const holdRef = inventoryHoldsCol().doc(holdId);

    await adminDb.runTransaction(async (tx) => {
      const holdSnap = await tx.get(holdRef);
      if (!holdSnap.exists) return;
      const hold = holdSnap.data();

      const col = getCollectionRef(hold.serviceType);
      const serviceRef = col.doc(hold.serviceId);

      tx.delete(holdRef);

      if (hold.serviceType === 'hotel' || hold.serviceType === 'hotel_room') {
        if (hold.roomId) {
          const docSnap = await tx.get(serviceRef);
          if (docSnap.exists) {
            const data = docSnap.data();
            const rooms = data.rooms || {};
            if (Array.isArray(rooms)) {
              const idx = rooms.findIndex(r => r.roomId === hold.roomId || r.id === hold.roomId);
              if (idx !== -1) {
                const current = rooms[idx].availability ?? rooms[idx].totalRooms ?? 0;
                rooms[idx] = { ...rooms[idx], availability: current + hold.quantity };
                tx.update(serviceRef, { rooms });
              }
            } else {
              tx.update(serviceRef, `rooms.${hold.roomId}.availability`, admin.firestore.FieldValue.increment(hold.quantity));
            }
          }
        }
      } else {
        tx.update(serviceRef, 'availability', admin.firestore.FieldValue.increment(hold.quantity));
      }
    });

    return true;
  } catch (error) {
    console.error('[releaseInventoryHoldAdmin] Error:', error.message);
    return false;
  }
}

/**
 * Create a booking and deduct availability for all items atomically.
 * Replicates the booking creation logic from firestore.js createBooking().
 * @param {Object} bookingData
 * @param {Array} bookingData.items - Cart items
 * @param {Object} [bookingData.contactInfo]
 * @param {string} [bookingData.gateway]
 * @returns {Promise<string|null>} Booking document ID or null on failure
 */
export async function createBookingAdmin(bookingData) {
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

    const { paymentStatus, bookingStatus, pricing, gateway, ...cleanData } = bookingData;

    const bookingRef = bookingsCol().doc();

    await adminDb.runTransaction(async (tx) => {
      tx.set(bookingRef, {
        ...cleanData,
        bookingCode,
        payment: {
          prepaid: prepaidType,
          total: Math.round(total),
          deposit: Math.round(deposit),
          balance: Math.round(balance),
          gate: (gateway || 'CASH').toUpperCase(),
          date: null,
          dueDate: dueDate,
        },
        status,
        contactInfo,
        erpSyncStatus: 'pending',
      });

      for (const item of items) {
        const col = getCollectionRef(item.serviceType);
        const serviceRef = col.doc(item.serviceId);
        const qty = item.quantity ?? item.rooms ?? 1;

        if (item.serviceType === 'hotel_room') {
          if (item.roomId) {
            const docSnap = await tx.get(serviceRef);
            if (docSnap.exists) {
              const data = docSnap.data();
              const rooms = data.rooms || {};
              if (Array.isArray(rooms)) {
                const idx = rooms.findIndex(r => r.roomId === item.roomId || r.id === item.roomId);
                if (idx !== -1) {
                  const current = rooms[idx].availability ?? rooms[idx].totalRooms ?? 0;
                  rooms[idx] = { ...rooms[idx], availability: Math.max(0, current - qty) };
                  tx.update(serviceRef, { rooms });
                }
              } else {
                tx.update(serviceRef, `rooms.${item.roomId}.availability`, admin.firestore.FieldValue.increment(-qty));
              }
            }
          }
        } else {
          tx.update(serviceRef, 'availability', admin.firestore.FieldValue.increment(-qty));
        }
      }
    });

    return bookingRef.id;
  } catch (error) {
    console.error('[createBookingAdmin] Error:', error.message);
    return null;
  }
}

/**
 * Cancel a booking and restore availability for all items atomically.
 * @param {string} bookingId
 * @returns {Promise<boolean>}
 */
export async function cancelBookingAdmin(bookingId) {
  try {
    const bookingRef = bookingsCol().doc(bookingId);

    await adminDb.runTransaction(async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) return;
      const booking = bookingSnap.data();

      tx.update(bookingRef, { status: 'cancelled' });

      const items = booking.items || [];
      const itemArr = Array.isArray(items) ? items : Object.values(items);

      if (itemArr.length > 0) {
        for (const item of itemArr) {
          const col = getCollectionRef(item.serviceType || booking.serviceType);
          const serviceRef = col.doc(item.serviceId || booking.serviceId);
          const qty = item.quantity ?? item.rooms ?? 1;

          if (item.serviceType === 'hotel_room') {
            if (item.roomId) {
              const docSnap = await tx.get(serviceRef);
              if (docSnap.exists) {
                const data = docSnap.data();
                const rooms = data.rooms || {};
                if (Array.isArray(rooms)) {
                  const idx = rooms.findIndex(r => r.roomId === item.roomId || r.id === item.roomId);
                  if (idx !== -1) {
                    const current = rooms[idx].availability ?? rooms[idx].totalRooms ?? 0;
                    rooms[idx] = { ...rooms[idx], availability: current + qty };
                    tx.update(serviceRef, { rooms });
                  }
                } else {
                  tx.update(serviceRef, `rooms.${item.roomId}.availability`, admin.firestore.FieldValue.increment(qty));
                }
              }
            }
          } else {
            tx.update(serviceRef, 'availability', admin.firestore.FieldValue.increment(qty));
          }
        }
      } else if (booking.serviceId && booking.serviceType) {
        const col = getCollectionRef(booking.serviceType);
        const serviceRef = col.doc(booking.serviceId);
        const qty = booking.quantity || 1;

        if (booking.serviceType === 'hotel' || booking.serviceType === 'hotel_room') {
          if (booking.roomId) {
            const docSnap = await tx.get(serviceRef);
            if (docSnap.exists) {
              const data = docSnap.data();
              const rooms = data.rooms || {};
              if (Array.isArray(rooms)) {
                const idx = rooms.findIndex(r => r.roomId === booking.roomId || r.id === booking.roomId);
                if (idx !== -1) {
                  const current = rooms[idx].availability ?? rooms[idx].totalRooms ?? 0;
                  rooms[idx] = { ...rooms[idx], availability: current + qty };
                  tx.update(serviceRef, { rooms });
                }
              } else {
                tx.update(serviceRef, `rooms.${booking.roomId}.availability`, admin.firestore.FieldValue.increment(qty));
              }
            }
          }
        } else {
          tx.update(serviceRef, 'availability', admin.firestore.FieldValue.increment(qty));
        }
      }
    });

    return true;
  } catch (error) {
    console.error('[cancelBookingAdmin] Error:', error.message);
    return false;
  }
}

// ─── Notifications ───────────────────────────────────────────────────

/**
 * Fetch user notifications.
 * @param {string} userId
 * @param {number} pageSize
 * @returns {Promise<Object[]>}
 */
export async function getUserNotifications(userId, pageSize = 20) {
  logger.log('[getUserNotifications] Called with:', { userId, pageSize });
  try {
    const snap = await notificationsCol().where('userId', '==', userId).orderBy('createdAt', 'desc').limit(pageSize).get();
    const result = serializeDocs(snap);
    logger.log('[getUserNotifications] Result:', { count: result.length });
    return result;
  } catch (error) {
    logger.error('[getUserNotifications] Error:', error.message);
    logger.log('[getUserNotifications] Result: empty (error)');
    return [];
  }
}

// ─── Settings ────────────────────────────────────────────────────────

/**
 * Fetch site settings.
 * @returns {Promise<Object|null>}
 */
export async function getSiteSettings() {
  logger.log('[getSiteSettings] Called');
  return getDocById('settings', 'site');
}

// ─── Blogs ───────────────────────────────────────────────────────────

/**
 * Fetch all published blog posts, ordered by creation date descending.
 * @param {number} [limit=50] - Maximum number of posts to return.
 * @returns {Promise<{blogs: Object[]}>}
 */
export async function getPublishedBlogs(limit = 50) {
  logger.log('[getPublishedBlogs] Called with:', { limit });
  try {
    const snap = await blogsCol()
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const blogsData = serializeDocs(snap);
    logger.log('[getPublishedBlogs] Result:', { count: blogsData.length });
    return { blogs: blogsData };
  } catch (error) {
    logger.error('[getPublishedBlogs] Error:', error.message);
    logger.log('[getPublishedBlogs] Result: empty (error)');
    return { blogs: [] };
  }
}

/**
 * Fetch a single blog post by slug.
 * @param {string} slug
 * @returns {Promise<{blog: Object|null}>}
 */
export async function getBlogBySlug(slug) {
  logger.log('[getBlogBySlug] Called with:', { slug });
  try {
    const snap = await blogsCol().where('slug', '==', slug).where('status', '==', 'published').limit(1).get();
    if (snap.empty) {
      logger.log('[getBlogBySlug] Result: null (not found)');
      return { blog: null };
    }
    const blogResult = serializeSnap(snap.docs[0]);
    logger.log('[getBlogBySlug] Result:', { id: blogResult?.id, slug });
    return { blog: blogResult };
  } catch (error) {
    logger.error('[getBlogBySlug] Error:', error.message);
    logger.log('[getBlogBySlug] Result: null (error)');
    return { blog: null };
  }
}

/**
 * Fetch related blog posts by category.
 * @param {string} category
 * @param {string} currentSlug
 * @param {number} count
 * @returns {Promise<{blogs: Object[]}>}
 */
export async function getRelatedBlogs(category, currentSlug, count = 3) {
  logger.log('[getRelatedBlogs] Called with:', { category, currentSlug, count });
  if (!category) return { blogs: [] };
  try {
    const snap = await blogsCol()
      .where('category', '==', category)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(count + 5)
      .get();
    let blogs = serializeDocs(snap).filter((b) => b.slug !== currentSlug).slice(0, count);
    logger.log('[getRelatedBlogs] Result:', { count: blogs.length });
    return { blogs };
  } catch (error) {
    logger.error('[getRelatedBlogs] Error:', error.message);
    logger.log('[getRelatedBlogs] Result: empty (error)');
    return { blogs: [] };
  }
}
