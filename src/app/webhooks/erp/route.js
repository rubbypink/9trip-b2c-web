/**
 * ERP Webhook — Inbound + Outbound Handler
 *
 * Endpoints (phân biệt bằng query param `action`):
 *
 * INBOUND (ERP → Firestore):
 *   POST /webhooks/erp?action=addTour      — Tạo/cập nhật tour
 *   POST /webhooks/erp?action=addHotel     — Tạo/cập nhật hotel
 *   POST /webhooks/erp?action=addActivity  — Tạo/cập nhật activity
 *   POST /webhooks/erp?action=addCar       — Tạo/cập nhật car
 *   POST /webhooks/erp?action=addRental    — Tạo/cập nhật rental
 *
 * OUTBOUND (Firestore → ERP):
 *   GET  /webhooks/erp?action=get&col=tours[&id=xxx] — Truy vấn dữ liệu
 *   POST /webhooks/erp?action=get&col=tours[&id=xxx]
 *
 * LEGACY (Web → ERP forward):
 *   POST /webhooks/erp?action=forward&event=... (giữ nguyên logic cũ)
 *
 * Authentication:
 *   Header `x-erp-secret` hoặc query param `secret`
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const ERP_WEBHOOK_BASE = 'https://9tripphuquoc.com/api/webhook';
const MAX_RETRIES = 3;
const VALID_READ_COLLECTIONS = ['tours', 'hotels', 'activities', 'cars', 'rentals', 'locations', 'bookings', 'settings'];

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate ERP webhook secret key.
 * @param {Request} request
 * @returns {boolean}
 */
function validateSecret(request) {
  const { searchParams } = new URL(request.url);
  const secret = request.headers.get('x-erp-secret') || searchParams.get('secret');
  return secret === process.env.ERP_WEBHOOK_SECRET;
}

/**
 * Build error response.
 * @param {number} status
 * @param {string} error
 * @param {string} message
 * @returns {NextResponse}
 */
function errorResponse(status, error, message) {
  return NextResponse.json({ success: false, error, message }, { status });
}

/**
 * Validate required fields in a data object.
 * @param {Object} data
 * @param {string[]} required
 * @returns {string|null} Error message or null
 */
function validateRequired(data, required) {
  for (const field of required) {
    const value = field.includes('.') ? field.split('.').reduce((o, k) => o?.[k], data) : data?.[field];
    if (value === undefined || value === null || value === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Check if a document exists in a collection by ID or slug.
 * @param {string} colName
 * @param {string} id
 * @param {string} [slug]
 * @returns {Promise<{exists: boolean, docId: string|null}>}
 */
async function findExistingDoc(colName, id, slug) {
  if (id) {
    const snap = await adminDb.collection(colName).doc(id).get();
    if (snap.exists) return { exists: true, docId: id };
  }
  if (slug) {
    const snap = await adminDb.collection(colName).where('slug', '==', slug).limit(1).get();
    if (!snap.empty) return { exists: true, docId: snap.docs[0].id };
  }
  return { exists: false, docId: id || null };
}

/**
 * Upsert a document (create or update) in a Firestore collection.
 * @param {string} colName
 * @param {Object} data
 * @param {string} [forcedId]
 * @returns {Promise<string>} Document ID
 */
async function upsertDoc(colName, data, forcedId) {
  const now = new Date().toISOString();
  const id = data.id || forcedId;
  delete data.id;

  if (id) {
    const ref = adminDb.collection(colName).doc(id);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ ...data, updatedAt: now });
    } else {
      await ref.set({ ...data, createdAt: now, updatedAt: now });
    }
    return id;
  }
  const ref = await adminDb.collection(colName).add({ ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

// ─── Outbound: Forward to ERP ────────────────────────────────────────

/**
 * Forward dữ liệu sang ERP với retry logic.
 * @param {string} eventType
 * @param {Object} payload
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function forwardToERP(eventType, payload) {
  const url = `${ERP_WEBHOOK_BASE}/${eventType}`;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        console.log(`[ERP Forward] ${eventType} — OK (attempt ${attempt})`);
        return { success: true };
      }
      lastError = `ERP responded with ${response.status}: ${await response.text().catch(() => '')}`;
    } catch (err) {
      lastError = err.message;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  console.error(`[ERP Forward] ${eventType} — FAILED after ${MAX_RETRIES} retries:`, lastError);
  return { success: false, error: lastError };
}

// ─── Inbound Handlers ────────────────────────────────────────────────

/**
 * Action: addTour — Create or update a tour.
 * @param {Object} data
 * @returns {Promise<NextResponse>}
 */
async function handleAddTour(data) {
  const missing = validateRequired(data, ['name', 'slug']);
  if (missing) return errorResponse(400, 'Bad Request', missing);

  const existing = await findExistingDoc('tours', data.id, data.slug);
  const tourId = await upsertDoc('tours', data, existing.docId);

  if (data.tourPricing && Array.isArray(data.tourPricing)) {
    const pricingCol = adminDb.collection('tours').doc(tourId).collection('tourPricing');
    const existingPricing = await pricingCol.get();
    const existingIds = new Set(existingPricing.docs.map((d) => d.id));

    for (const tier of data.tourPricing) {
      if (tier.id && existingIds.has(tier.id)) {
        await pricingCol.doc(tier.id).update({ ...tier, updatedAt: new Date().toISOString() });
      } else {
        const ref = tier.id ? pricingCol.doc(tier.id) : pricingCol.doc();
        await ref.set({ ...tier, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    }
  }

  console.log(`[ERP Webhook] ✅ addTour: ${tourId} (${data.slug})`);
  return NextResponse.json({ success: true, itemId: tourId });
}

/**
 * Action: addHotel — Create or update a hotel.
 * @param {Object} data
 * @returns {Promise<NextResponse>}
 */
async function handleAddHotel(data) {
  const missing = validateRequired(data, ['name', 'slug']);
  if (missing) return errorResponse(400, 'Bad Request', missing);

  const existing = await findExistingDoc('hotels', data.id, data.slug);
  const hotelId = await upsertDoc('hotels', data, existing.docId);

  // Handle hotel_price_schedules if provided
  if (data.hotelPriceSchedules && Array.isArray(data.hotelPriceSchedules)) {
    const schedulesCol = adminDb.collection('hotel_price_schedules');
    for (const schedule of data.hotelPriceSchedules) {
      const docId = schedule.id || `${hotelId}_base_${schedule.year || new Date().getFullYear()}`;
      await schedulesCol.doc(docId).set({
        ...schedule,
        info: { ...schedule.info, hotelId, year: schedule.year || new Date().getFullYear() },
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  }

  console.log(`[ERP Webhook] ✅ addHotel: ${hotelId} (${data.slug})`);
  return NextResponse.json({ success: true, itemId: hotelId });
}

/**
 * Action: addActivity — Create or update an activity.
 * @param {Object} data
 * @returns {Promise<NextResponse>}
 */
async function handleAddActivity(data) {
  const missing = validateRequired(data, ['title', 'slug']);
  if (missing) return errorResponse(400, 'Bad Request', missing);

  const existing = await findExistingDoc('activities', data.id, data.slug);
  const activityId = await upsertDoc('activities', data, existing.docId);

  console.log(`[ERP Webhook] ✅ addActivity: ${activityId} (${data.slug})`);
  return NextResponse.json({ success: true, itemId: activityId });
}

/**
 * Action: addCar — Create or update a car.
 * @param {Object} data
 * @returns {Promise<NextResponse>}
 */
async function handleAddCar(data) {
  const slug = data.slug || data.title?.toLowerCase().replace(/\s+/g, '-') || data.name?.toLowerCase().replace(/\s+/g, '-');
  const missing = validateRequired(data, ['name']);
  if (missing) return errorResponse(400, 'Bad Request', missing);

  const existing = await findExistingDoc('cars', data.id, slug);
  const carId = await upsertDoc('cars', { ...data, slug }, existing.docId);

  console.log(`[ERP Webhook] ✅ addCar: ${carId}`);
  return NextResponse.json({ success: true, itemId: carId });
}

/**
 * Action: addRental — Create or update a rental.
 * @param {Object} data
 * @returns {Promise<NextResponse>}
 */
async function handleAddRental(data) {
  const slug = data.slug || data.title?.toLowerCase().replace(/\s+/g, '-') || data.name?.toLowerCase().replace(/\s+/g, '-');
  const missing = validateRequired(data, ['name']);
  if (missing) return errorResponse(400, 'Bad Request', missing);

  const existing = await findExistingDoc('rentals', data.id, slug);
  const rentalId = await upsertDoc('rentals', { ...data, slug }, existing.docId);

  console.log(`[ERP Webhook] ✅ addRental: ${rentalId}`);
  return NextResponse.json({ success: true, itemId: rentalId });
}

/**
 * Action: get — Query data from Firestore for ERP.
 * @param {URL} url
 * @returns {Promise<NextResponse>}
 */
async function handleGet(url) {
  const colName = url.searchParams.get('col');
  const id = url.searchParams.get('id');

  if (!colName) return errorResponse(400, 'Bad Request', 'Missing query param: col');
  if (!VALID_READ_COLLECTIONS.includes(colName)) {
    return errorResponse(404, 'Not Found', `Collection '${colName}' not supported`);
  }

  const col = adminDb.collection(colName);

  if (id) {
    const snap = await col.doc(id).get();
    if (!snap.exists) return errorResponse(404, 'Not Found', `Document '${id}' not found in '${colName}'`);
    return NextResponse.json({ success: true, data: { id: snap.id, ...snap.data() } });
  }

  const snap = await col.orderBy('createdAt', 'desc').limit(200).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ success: true, data: docs, count: docs.length });
}

/**
 * Action: forward — Legacy outbound forwarding (Web → ERP).
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
async function handleForward(request) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('event');

  const validEvents = ['new-customer', 'cancel-booking', 'update-booking', 'new-booking', 'update-account'];
  if (!eventType || !validEvents.includes(eventType)) {
    return errorResponse(400, 'Bad Request', `Invalid event type: ${eventType}. Valid: ${validEvents.join(', ')}`);
  }

  const payload = await request.json();
  if (!payload || !payload.id) {
    return errorResponse(400, 'Bad Request', "Payload must include 'id'");
  }

  const result = await forwardToERP(eventType, payload);
  return NextResponse.json({ received: true, forwarded: result.success, event: eventType, id: payload.id });
}

// ─── Route Handlers ──────────────────────────────────────────────────

/**
 * POST handler — Inbound + Legacy outbound.
 * Phân biệt bằng query param `action`.
 */
export async function POST(request) {
  if (!validateSecret(request)) {
    return errorResponse(401, 'Unauthorized', 'Invalid or missing x-erp-secret header');
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || searchParams.get('event') || '';

    if (!action) {
      return errorResponse(400, 'Bad Request', 'Missing action parameter. Use ?action=addTour|addHotel|addActivity|addCar|addRental|get|forward');
    }

    if (action === 'get') {
      return await handleGet(new URL(request.url));
    }

    if (action === 'forward') {
      return await handleForward(request);
    }

    const data = await request.json();

    switch (action) {
      case 'addTour':
        return await handleAddTour(data);
      case 'addHotel':
        return await handleAddHotel(data);
      case 'addActivity':
        return await handleAddActivity(data);
      case 'addCar':
        return await handleAddCar(data);
      case 'addRental':
        return await handleAddRental(data);
      default:
        return errorResponse(400, 'Bad Request', `Unknown action: ${action}`);
    }
  } catch (err) {
    console.error('[ERP Webhook] Error:', err);
    return errorResponse(500, 'Internal Server Error', err.message);
  }
}

/**
 * GET handler — Only action=get for querying data.
 */
export async function GET(request) {
  if (!validateSecret(request)) {
    return errorResponse(401, 'Unauthorized', 'Invalid or missing x-erp-secret header');
  }

  try {
    const action = new URL(request.url).searchParams.get('action');
    if (action !== 'get') {
      return errorResponse(400, 'Bad Request', 'GET only supports action=get');
    }
    return await handleGet(new URL(request.url));
  } catch (err) {
    console.error('[ERP Webhook] GET Error:', err);
    return errorResponse(500, 'Internal Server Error', err.message);
  }
}
