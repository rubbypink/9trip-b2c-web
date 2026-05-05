import { adminDb } from './firebase-admin';

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
function serializeSnap(snap) {
  return serializeAdminDoc({ id: snap.id, ...snap.data() });
}

/**
 * Serialize an array of document snapshots.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap
 * @returns {Object[]}
 */
function serializeDocs(snap) {
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

// ─── Generic Helpers ─────────────────────────────────────────────────

/**
 * Fetch a single document by ID from a collection.
 * @param {string} colName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getDocById(colName, id) {
  try {
    const snap = await adminDb.collection(colName).doc(id).get();
    return snap.exists ? serializeSnap(snap) : null;
  } catch (error) {
    console.error(`[getDocById] Error fetching ${colName}/${id}:`, error.message);
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
  try {
    const snap = await adminDb.collection(colName).where('slug', '==', slug).limit(1).get();
    if (snap.empty) return null;
    return serializeSnap(snap.docs[0]);
  } catch (error) {
    console.error(`[getDocBySlug] Error fetching ${colName}/${slug}:`, error.message);
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
  try {
    let q = toursCol().orderBy('createdAt', 'desc').limit(pageSize);
    if (cursor) q = toursCol().orderBy('createdAt', 'desc').startAfter(cursor).limit(pageSize);
    const snap = await q.get();
    return { tours: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[getTours] Error:', error.message);
    return { tours: [], lastVisible: null };
  }
}

/**
 * Fetch featured tours.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedTours(count = 8) {
  try {
    const snap = await toursCol().where('isFeatured', '==', true).orderBy('createdAt', 'desc').limit(count).get();
    if (!snap.empty) return serializeDocs(snap);
  } catch (error) {
    console.error('[getFeaturedTours] Index not ready, falling back:', error.message);
  }
  try {
    const snap = await toursCol().orderBy('createdAt', 'desc').limit(count).get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getFeaturedTours] Fallback error:', error.message);
    return [];
  }
}

/**
 * Search tours with filters.
 * @param {Object} filters
 * @returns {Promise<{tours: Object[]}>}
 */
export async function searchTours(filters = {}) {
  const { locationId, tourTypeId, minPrice, maxPrice, minRating, sortBy = 'newest', pageSize = 12, page = 1 } = filters;
  try {
    let q = toursCol();
    if (locationId) q = q.where('locationId', '==', locationId);
    if (tourTypeId) q = q.where('tourTypeId', '==', tourTypeId);
    if (minRating) q = q.where('ratingAverage', '>=', minRating);

    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.adultPrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.adultPrice', 'desc'); break;
      case 'rating': q = q.orderBy('ratingAverage', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }

    const limitVal = page > 1 ? page * pageSize : pageSize;
    q = q.limit(limitVal);
    const snap = await q.get();
    let tours = serializeDocs(snap);

    if (minPrice != null && minPrice !== '') tours = tours.filter((t) => t.pricing?.adultPrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') tours = tours.filter((t) => t.pricing?.adultPrice <= Number(maxPrice));

    return { tours };
  } catch (error) {
    console.error('[searchTours] Error:', error.message);
    try {
      const snap = await toursCol().orderBy('createdAt', 'desc').limit(page * pageSize).get();
      return { tours: serializeDocs(snap) };
    } catch {
      return { tours: [] };
    }
  }
}

/**
 * Count tours with filters.
 * @param {Object} filters
 * @returns {Promise<number>}
 */
export async function countTours(filters = {}) {
  const { locationId, tourTypeId, minRating } = filters;
  try {
    let q = toursCol();
    if (locationId) q = q.where('locationId', '==', locationId);
    if (tourTypeId) q = q.where('tourTypeId', '==', tourTypeId);
    if (minRating) q = q.where('ratingAverage', '>=', minRating);
    const snap = await q.count().get();
    return snap.data().count;
  } catch (error) {
    console.error('[countTours] Error:', error.message);
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
  try {
    const tour = await getDocBySlug('tours', slug);
    if (!tour || !tour.locationId) return { tours: [] };

    const snap = await toursCol().where('locationId', '==', tour.locationId).orderBy('createdAt', 'desc').limit(count * 2).get();
    const tours = serializeDocs(snap).filter((t) => t.id !== tour.id).slice(0, count);
    return { tours };
  } catch (error) {
    console.error('[getRelatedTours] Error:', error.message);
    return { tours: [] };
  }
}

/**
 * Fetch a single tour by slug.
 * @param {string} slug
 * @returns {Promise<{tour: Object|null}>}
 */
export async function getTourBySlug(slug) {
  try {
    const tour = await getDocBySlug('tours', slug);
    return { tour };
  } catch (error) {
    console.error('[getTourBySlug] Error:', error.message);
    return { tour: null };
  }
}

/**
 * Fetch pricing tiers for a tour (subcollection: tours/{tourId}/tourPricing).
 * @param {string} tourId
 * @returns {Promise<Object[]>}
 */
export async function getTourPricing(tourId) {
  try {
    const snap = await adminDb.collection('tours').doc(tourId).collection('tourPricing')
      .where('isActive', '==', true).orderBy('sortOrder', 'asc').get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getTourPricing] Error:', error.message);
    return [];
  }
}

/**
 * Fetch reviews for a tour by slug.
 * @param {string} slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getTourReviews(slug) {
  try {
    const tour = await getDocBySlug('tours', slug);
    if (!tour) return { reviews: [], totalRating: 0, avgRating: 0 };
    const { reviews } = await getReviews('tour', tour.id);
    const totalRating = reviews.length;
    const avgRating = totalRating > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating : 0;
    return { reviews, totalRating, avgRating };
  } catch (error) {
    console.error('[getTourReviews] Error:', error.message);
    return { reviews: [], totalRating: 0, avgRating: 0 };
  }
}

// ─── Hotels ──────────────────────────────────────────────────────────

/**
 * Fetch hotels with pagination.
 * @returns {Promise<{hotels: Object[], lastVisible: Object|null}>}
 */
export async function getHotels({ pageSize = 12, cursor = null } = {}) {
  try {
    let q = hotelsCol().orderBy('createdAt', 'desc').limit(pageSize);
    if (cursor) q = hotelsCol().orderBy('createdAt', 'desc').startAfter(cursor).limit(pageSize);
    const snap = await q.get();
    return { hotels: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[getHotels] Error:', error.message);
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
  const { locationId, starRating, minPrice, maxPrice, amenities, sortBy = 'newest', pageSize = 12, cursor } = filters;
  try {
    let q = hotelsCol();
    if (locationId) q = q.where('address.cityId', '==', locationId);
    q = q.orderBy('createdAt', 'desc').limit(pageSize * 2);
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
    if (minPrice != null && minPrice !== '') {
      hotels = hotels.filter((h) => (h.pricing?.basePrice || 0) >= Number(minPrice));
    }
    if (maxPrice != null && maxPrice !== '') {
      hotels = hotels.filter((h) => (h.pricing?.basePrice || 0) <= Number(maxPrice));
    }

    switch (sortBy) {
      case 'price_asc': hotels.sort((a, b) => (a.pricing?.basePrice || 0) - (b.pricing?.basePrice || 0)); break;
      case 'price_desc': hotels.sort((a, b) => (b.pricing?.basePrice || 0) - (a.pricing?.basePrice || 0)); break;
      case 'rating': hotels.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0)); break;
    }

    hotels = hotels.slice(0, pageSize);
    return { hotels, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[searchHotels] Error:', error.message);
    try {
      const snap = await hotelsCol().orderBy('createdAt', 'desc').limit(pageSize).get();
      return { hotels: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
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
  try {
    const snap = await hotelsCol().where('isFeatured', '==', true).orderBy('createdAt', 'desc').limit(count).get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getFeaturedHotels] Error:', error.message);
    return [];
  }
}

/**
 * Fetch a single hotel by slug.
 * @param {string} slug
 * @returns {Promise<{hotel: Object|null}>}
 */
export async function getHotelBySlug(slug) {
  try {
    const snap = await hotelsCol().where('slug', '==', slug).limit(1).get();
    if (snap.empty) return { hotel: null };
    return { hotel: serializeSnap(snap.docs[0]) };
  } catch (error) {
    console.error('[getHotelBySlug] Error:', error.message);
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
  if (!locationId) return { hotels: [] };
  try {
    const snap = await hotelsCol().where('address.cityId', '==', locationId).limit(count + 10).get();
    let hotels = serializeDocs(snap).filter((h) => h.slug !== currentSlug);
    hotels.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    hotels = hotels.slice(0, count);
    return { hotels };
  } catch (error) {
    console.error('[getRelatedHotels] Error:', error.message);
    return { hotels: [] };
  }
}

/**
 * Fetch reviews for a hotel by slug.
 * @param {string} slug
 * @returns {Promise<{reviews: Object[], totalRating: number, avgRating: number}>}
 */
export async function getHotelReviews(slug) {
  try {
    const hotel = await getDocBySlug('hotels', slug);
    if (!hotel) return { reviews: [], totalRating: 0, avgRating: 0 };
    const { reviews } = await getReviews('hotel', hotel.id);
    const totalRating = reviews.length;
    const avgRating = totalRating > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating : hotel.rating?.average || 0;
    return { reviews, totalRating, avgRating };
  } catch (error) {
    console.error('[getHotelReviews] Error:', error.message);
    try {
      const hotel = await getDocBySlug('hotels', slug);
      if (!hotel) return { reviews: [], totalRating: 0, avgRating: 0 };
      return { reviews: [], totalRating: hotel.rating?.count || 0, avgRating: hotel.rating?.average || 0 };
    } catch {
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
  try {
    const docId = `${hotelId}_base_${year}`;
    const snap = await adminDb.collection('hotel_price_schedules').doc(docId).get();
    if (!snap.exists) return null;
    const data = serializeSnap(snap);
    if (data.info?.hotelId !== hotelId || data.info?.year !== year || data.info?.status !== 'actived') return null;
    return data;
  } catch (error) {
    console.error('[getHotelPriceSchedule] Error:', error.message);
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
  const roomsArr = Array.isArray(rooms) ? rooms : (rooms ? Object.values(rooms) : []);
  if (roomsArr.length === 0) return [];

  const sortedRooms = [...roomsArr].sort((a, b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const ci = new Date(checkIn);
  const co = new Date(checkOut);

  function buildRoomRow(room, dates) {
    if (!room.isActive) {
      return {
        roomId: room.id, roomName: room.name, totalRooms: room.totalRooms || 0, maxGuests: room.maxGuests || 0,
        bedType: room.bedType || '', roomSize: room.roomSize || 0, description: room.description || '',
        amenities: room.amenities || [], included: room.included || [], featuredImage: room.featuredImage || '',
        gallery: room.gallery || [], isActive: false, sortOrder: room.sortOrder ?? 999, rateTypes: [],
      };
    }
    const rateTypeMap = {};
    for (const date of dates) {
      const pricing = resolveRoomPricing(priceSchedule, room.id, date);
      for (const p of pricing) {
        if (!rateTypeMap[p.rateType]) rateTypeMap[p.rateType] = { rateType: p.rateType, dailyPrices: [], avgSellPrice: 0 };
        rateTypeMap[p.rateType].dailyPrices.push({ date, sellPrice: p.sellPrice, costPrice: p.costPrice });
      }
    }
    const rateTypes = Object.values(rateTypeMap).map((rt) => {
      rt.avgSellPrice = rt.dailyPrices.reduce((s, d) => s + d.sellPrice, 0) / (rt.dailyPrices.length || 1);
      return rt;
    });
    return {
      roomId: room.id, roomName: room.name, totalRooms: room.totalRooms || 0, maxGuests: room.maxGuests || 0,
      bedType: room.bedType || '', roomSize: room.roomSize || 0, description: room.description || '',
      amenities: room.amenities || [], included: room.included || [], featuredImage: room.featuredImage || '',
      gallery: room.gallery || [], isActive: true, sortOrder: room.sortOrder ?? 999, rateTypes,
    };
  }

  if (isNaN(ci.getTime()) || isNaN(co.getTime()) || co <= ci) {
    const today = new Date().toISOString().split('T')[0];
    return sortedRooms.map((room) => buildRoomRow(room, [today]));
  }

  const dates = [];
  for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return sortedRooms.map((room) => buildRoomRow(room, dates));
}

/**
 * Enrich hotels with lowest price from hotel_price_schedules.
 * @param {Object[]} hotels
 * @returns {Promise<Object[]>}
 */
export async function enrichHotelsWithLowestPrices(hotels) {
  if (!hotels || hotels.length === 0) return hotels;
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
  return hotels;
}

// ─── Activities ──────────────────────────────────────────────────────

/**
 * Fetch activities with pagination.
 * @returns {Promise<{activities: Object[], lastVisible: Object|null}>}
 */
export async function getActivitiesList({ pageSize = 12, cursor = null } = {}) {
  try {
    let q = activitiesCol().orderBy('createdAt', 'desc').limit(pageSize);
    if (cursor) q = activitiesCol().orderBy('createdAt', 'desc').startAfter(cursor).limit(pageSize);
    const snap = await q.get();
    return { activities: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[getActivitiesList] Error:', error.message);
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
  try {
    let q = activitiesCol();
    if (locationId) q = q.where('locationId', '==', locationId);
    if (categoryId) q = q.where('categoryId', '==', categoryId);

    let countQ = activitiesCol();
    if (locationId) countQ = countQ.where('locationId', '==', locationId);
    if (categoryId) countQ = countQ.where('categoryId', '==', categoryId);
    const countSnap = await countQ.count().get();
    const totalCount = countSnap.data().count;

    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.basePrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.basePrice', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }

    q = page > 1 && !cursor ? q.limit(page * pageSize) : q.limit(pageSize);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    let activities = serializeDocs(snap);

    if (minPrice != null && minPrice !== '') activities = activities.filter((a) => a.pricing?.basePrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') activities = activities.filter((a) => a.pricing?.basePrice <= Number(maxPrice));

    return { activities, totalCount, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[searchActivities] Error:', error.message);
    try {
      const snap = await activitiesCol().orderBy('createdAt', 'desc').limit(pageSize).get();
      return { activities: serializeDocs(snap), totalCount: snap.size, lastVisible: snap.docs[snap.docs.length - 1] || null };
    } catch {
      return { activities: [], totalCount: 0, lastVisible: null };
    }
  }
}

/**
 * Fetch a single activity by slug.
 * @param {string} slug
 * @returns {Promise<{activity: Object|null}>}
 */
export async function getActivityBySlug(slug) {
  try {
    const activity = await getDocBySlug('activities', slug);
    return { activity };
  } catch (error) {
    console.error('[getActivityBySlug] Error:', error.message);
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
  try {
    const activity = await getDocBySlug('activities', slug);
    if (!activity || !activity.locationId) return { activities: [] };
    const snap = await activitiesCol().where('locationId', '==', activity.locationId).orderBy('createdAt', 'desc').limit(count * 2).get();
    const activities = serializeDocs(snap).filter((a) => a.id !== activity.id).slice(0, count);
    return { activities };
  } catch (error) {
    console.error('[getRelatedActivities] Error:', error.message);
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
  const { carType, transmission, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, cursor } = filters;
  try {
    let q = carsCol();
    if (carType) q = q.where('carType', '==', carType);
    if (transmission) q = q.where('transmission', '==', transmission);
    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.basePrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.basePrice', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }
    q = q.limit(pageSize);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    let cars = serializeDocs(snap);
    if (minPrice != null && minPrice !== '') cars = cars.filter((c) => c.pricing?.basePrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') cars = cars.filter((c) => c.pricing?.basePrice <= Number(maxPrice));
    return { cars, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[searchCars] Error:', error.message);
    try {
      const snap = await carsCol().orderBy('createdAt', 'desc').limit(pageSize).get();
      return { cars: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
    } catch {
      return { cars: [], lastVisible: null };
    }
  }
}

// ─── Rentals ─────────────────────────────────────────────────────────

/**
 * Search rentals with filters.
 * @param {Object} filters
 * @returns {Promise<{rentals: Object[], lastVisible: Object|null}>}
 */
export async function searchRentals(filters = {}) {
  const { type, locationId, minPrice, maxPrice, sortBy = 'newest', pageSize = 12, cursor } = filters;
  try {
    let q = rentalsCol();
    if (type) q = q.where('type', '==', type);
    if (locationId) q = q.where('locationId', '==', locationId);
    switch (sortBy) {
      case 'price_asc': q = q.orderBy('pricing.basePrice', 'asc'); break;
      case 'price_desc': q = q.orderBy('pricing.basePrice', 'desc'); break;
      default: q = q.orderBy('createdAt', 'desc');
    }
    q = q.limit(pageSize);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    let rentals = serializeDocs(snap);
    if (minPrice != null && minPrice !== '') rentals = rentals.filter((r) => r.pricing?.basePrice >= Number(minPrice));
    if (maxPrice != null && maxPrice !== '') rentals = rentals.filter((r) => r.pricing?.basePrice <= Number(maxPrice));
    return { rentals, lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[searchRentals] Error:', error.message);
    try {
      const snap = await rentalsCol().orderBy('createdAt', 'desc').limit(pageSize).get();
      return { rentals: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
    } catch {
      return { rentals: [], lastVisible: null };
    }
  }
}

// ─── Locations ───────────────────────────────────────────────────────

/**
 * Fetch all locations.
 * @returns {Promise<Object[]>}
 */
export async function getLocations() {
  try {
    const snap = await locationsCol().orderBy('name', 'asc').get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getLocations] Error:', error.message);
    return [];
  }
}

/**
 * Fetch featured locations.
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function getFeaturedLocations(count = 8) {
  try {
    const snap = await locationsCol().where('isFeatured', '==', true).limit(count).get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getFeaturedLocations] Error:', error.message);
    return [];
  }
}

/**
 * Fetch location by slug.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getLocationBySlug(slug) {
  try {
    return await getDocBySlug('locations', slug);
  } catch (error) {
    console.error('[getLocationBySlug] Error:', error.message);
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
  return getDocById('bookings', id);
}

/**
 * Fetch bookings for a user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserBookings(userId) {
  try {
    const snap = await bookingsCol().where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getUserBookings] Error:', error.message);
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
  try {
    let q = reviewsCol()
      .where('serviceType', '==', serviceType)
      .where('serviceId', '==', serviceId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc');
    q = cursor ? q.startAfter(cursor).limit(pageSize) : q.limit(pageSize);
    const snap = await q.get();
    return { reviews: serializeDocs(snap), lastVisible: snap.docs[snap.docs.length - 1] || null };
  } catch (error) {
    console.error('[getReviews] Error:', error.message);
    return { reviews: [], lastVisible: null };
  }
}

/**
 * Fetch reviews written by a user.
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
export async function getUserReviews(userId) {
  try {
    const snap = await reviewsCol().where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getUserReviews] Error:', error.message);
    return [];
  }
}

// ─── Users ───────────────────────────────────────────────────────────

/**
 * Fetch user profile by UID.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  return getDocById('users', uid);
}

/**
 * Fetch detailed wishlist items for a user.
 * @param {string} uid
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

// ─── Coupons ─────────────────────────────────────────────────────────

/**
 * Validate a coupon code.
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
export async function validateCoupon(code) {
  try {
    const snap = await couponsCol().where('code', '==', code).where('status', '==', 'active').limit(1).get();
    if (snap.empty) return null;
    const coupon = serializeSnap(snap.docs[0]);
    if (coupon.expireDate && new Date(coupon.expireDate) < new Date()) return null;
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return null;
    return coupon;
  } catch (error) {
    console.error('[validateCoupon] Error:', error.message);
    return null;
  }
}

// ─── Inventory Hold ──────────────────────────────────────────────────

/**
 * Check real-time availability considering bookings and active holds.
 * @param {string} serviceId
 * @param {string} serviceType
 * @param {*} startDate
 * @param {number} totalCapacity
 * @returns {Promise<number>}
 */
export async function getRealAvailability(serviceId, serviceType, startDate, totalCapacity) {
  try {
    const bookingsSnap = await bookingsCol()
      .where('serviceId', '==', serviceId)
      .where('startDate', '==', startDate)
      .where('bookingStatus', '==', 'confirmed')
      .get();
    const bookedCount = bookingsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

    const now = new Date();
    const holdsSnap = await inventoryHoldsCol()
      .where('serviceId', '==', serviceId)
      .where('startDate', '==', startDate)
      .where('expiresAt', '>', now)
      .get();
    const heldCount = holdsSnap.docs.reduce((sum, d) => sum + (d.data().quantity || 1), 0);

    return Math.max(0, totalCapacity - bookedCount - heldCount);
  } catch (error) {
    console.error('[getRealAvailability] Error:', error.message);
    return totalCapacity;
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
  try {
    const snap = await notificationsCol().where('userId', '==', userId).orderBy('createdAt', 'desc').limit(pageSize).get();
    return serializeDocs(snap);
  } catch (error) {
    console.error('[getUserNotifications] Error:', error.message);
    return [];
  }
}

// ─── Settings ────────────────────────────────────────────────────────

/**
 * Fetch site settings.
 * @returns {Promise<Object|null>}
 */
export async function getSiteSettings() {
  return getDocById('settings', 'site');
}
