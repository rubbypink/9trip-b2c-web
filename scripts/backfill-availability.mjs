#!/usr/bin/env node

/**
 * Backfill `availability` field to service documents that don't have it yet.
 * Idempotent - safe to run multiple times.
 *
 * Collections handled:
 *   hotels    - adds availability to each room object in rooms[]
 *               value = room.totalRooms || 1
 *   tours     - adds availability at document root
 *               value = capacity || 100
 *   activities - adds availability at document root
 *               value = capacity || 100
 *   cars      - adds availability at document root
 *               value = 100
 *   rentals   - adds availability at document root
 *               value = 100
 *
 * Usage: node scripts/backfill-availability.mjs
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Firebase Admin Init
// ---------------------------------------------------------------------------

function initFirebase() {
  if (admin.apps.length) return admin.firestore();

  // Try env vars first (Vercel / CI pattern from src/lib/firebase-admin.js)
  const projectId = process.env.APP_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.APP_FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.APP_FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && rawKey) {
    // Normalize private key (handles literal \n, double-escape, surrounding quotes)
    let cleaned = rawKey.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    cleaned = cleaned.replace(/\\\\n/g, '\\n').replace(/\\n/g, '\n');
    cleaned = cleaned.split('\n').map((l) => l.trim()).join('\n');
    cleaned = cleaned.trimEnd() + '\n';

    admin.initializeApp({
      credential: admin.credential.cert({
        type: 'service_account',
        project_id: projectId,
        private_key_id: process.env.APP_FIREBASE_PRIVATE_KEY_ID || '',
        private_key: cleaned,
        client_email: clientEmail,
        client_id: process.env.APP_FIREBASE_CLIENT_ID || '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      }),
    });
    console.log('[init] Firebase Admin initialized from env vars');
    return admin.firestore();
  }

  // Fall back to local service account JSON
  const saPath = path.resolve(projectRoot, 'tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json');
  if (fs.existsSync(saPath)) {
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
    if (sa.private_key) {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      storageBucket: 'tripphuquoc-db-fs.firebasestorage.app',
    });
    console.log('[init] Firebase Admin initialized from service account JSON');
    return admin.firestore();
  }

  throw new Error(
    'No Firebase credentials found. Set FIREBASE_ADMIN_PROJECT_ID, ' +
    'FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars, or place the ' +
    'service account JSON at project root.'
  );
}

const db = initFirebase();
const { FieldPath } = admin.firestore;

// ---------------------------------------------------------------------------
// Process a single collection
// ---------------------------------------------------------------------------

/**
 * @param {string} collectionName
 * @param {(data: Object, id: string) => Object|null} getUpdate
 *   Receives doc data + id, returns an object of fields to update,
 *   or null if no update is needed.
 * @returns {Promise<{processed: number, updated: number}>}
 */
async function processCollection(collectionName, getUpdate) {
  console.log(`\n--- Processing collection: ${collectionName} ---`);

  const snapshot = await db.collection(collectionName).get();
  const total = snapshot.size;
  console.log(`  Found ${total} documents`);

  let processed = 0;
  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    const updateData = getUpdate(data, doc.id);

    if (updateData && Object.keys(updateData).length > 0) {
      batch.update(doc.ref, updateData);
      batchCount++;
      updated++;
    }

    if (batchCount >= 500) {
      await batch.commit();
      console.log(`  Committed batch (${processed}/${total})`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch (${processed}/${total})`);
  }

  return { processed, updated };
}

// ---------------------------------------------------------------------------
// Per-collection update logic
// ---------------------------------------------------------------------------

/**
 * Hotels: add `availability` to each room in rooms[] or rooms Map.
 *   rooms as array  -> availability = room.totalRooms || 1 for each room
 *   rooms as Map    -> same, iterated over entries
 * Uses FieldPath for nested field access as requested.
 */
function getHotelUpdate(data) {
  const rooms = data.rooms;
  if (!rooms) return null;

  let changed = false;
  let newRooms;

  if (Array.isArray(rooms)) {
    newRooms = rooms.map((room) => {
      if (room && typeof room.availability === 'number') return room;
      changed = true;
      return { ...room, availability: (room && room.totalRooms) || 1 };
    });
  } else if (typeof rooms === 'object' && rooms !== null) {
    // Firestore Map (object with string keys)
    newRooms = {};
    for (const [key, room] of Object.entries(rooms)) {
      if (room && typeof room.availability === 'number') {
        newRooms[key] = room;
      } else {
        changed = true;
        newRooms[key] = { ...room, availability: (room && room.totalRooms) || 1 };
      }
    }
  }

  if (!changed) return null;

  // Use FieldPath for the nested rooms field
  return { [new FieldPath('rooms')]: newRooms };
}

/**
 * Tours: add `availability` to document root.
 *   availability = capacity || 100
 */
function getTourUpdate(data) {
  if (typeof data.availability === 'number') return null;
  const capacity = typeof data.capacity === 'number' ? data.capacity : null;
  return { availability: capacity || 100 };
}

/**
 * Activities: add `availability` to document root.
 *   availability = capacity || 100
 */
function getActivityUpdate(data) {
  if (typeof data.availability === 'number') return null;
  const capacity = typeof data.capacity === 'number' ? data.capacity : null;
  return { availability: capacity || 100 };
}

/**
 * Cars: add `availability` to document root = 100.
 */
function getCarUpdate(data) {
  if (typeof data.availability === 'number') return null;
  return { availability: 100 };
}

/**
 * Rentals: add `availability` to document root = 100.
 */
function getRentalUpdate(data) {
  if (typeof data.availability === 'number') return null;
  return { availability: 100 };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const collections = [
  { name: 'hotels',     handler: getHotelUpdate },
  { name: 'tours',      handler: getTourUpdate },
  { name: 'activities', handler: getActivityUpdate },
  { name: 'cars',       handler: getCarUpdate },
  { name: 'rentals',    handler: getRentalUpdate },
];

const summary = [];

for (const { name, handler } of collections) {
  try {
    const result = await processCollection(name, handler);
    summary.push({ collection: name, ...result });
  } catch (err) {
    console.error(`[ERROR] Processing ${name}:`, err.message);
    summary.push({ collection: name, processed: 0, updated: 0, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n========================================');
console.log('  BACKFILL SUMMARY');
console.log('========================================');
let totalP = 0;
let totalU = 0;
for (const s of summary) {
  const flag = s.error ? 'X' : 'OK';
  const line = `  ${flag}  ${s.collection.padEnd(12)}  processed: ${String(s.processed).padStart(4)}  updated: ${String(s.updated).padStart(4)}`;
  console.log(s.error ? `${line}  error: ${s.error}` : line);
  totalP += s.processed;
  totalU += s.updated;
}
console.log('----------------------------------------');
console.log(`  Total processed: ${totalP}`);
console.log(`  Total updated:   ${totalU}`);
console.log('========================================\n');
