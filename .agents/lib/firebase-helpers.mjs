/**
 * Firebase Admin Helpers — Shared CRUD utilities for scraper skills.
 *
 * Unified Firebase Admin SDK wrapper used by:
 *   - booking-scraper
 *   - tour-scraper
 *   - activity-scraper
 *
 * @module firebase-helpers
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// ─────────────────────────────────────────────────────────────────────────────
// Environment & Initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format private key to handle escaped newlines (common in Vercel/env vars).
 * @param {string} key - Private key string
 * @returns {string|undefined} Formatted key
 */
function formatPrivateKey(key) {
	if (!key) return undefined;
	return key.replace(/\\n/g, '\n');
}

/**
 * Load .env.local variables into process.env.
 * Parses the file and sets environment variables that aren't already defined.
 * @returns {void}
 */
export function loadEnvConfig() {
	const envPath = path.resolve(PROJECT_ROOT, '.env.local');
	if (!fs.existsSync(envPath)) return;

	const envContent = fs.readFileSync(envPath, 'utf-8');
	for (const line of envContent.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;

		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();

		// Remove surrounding quotes
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

/**
 * Get service account path.
 * @returns {string} Absolute path to service account JSON
 */
function getServiceAccountPath() {
	return path.resolve(PROJECT_ROOT, 'tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json');
}

/**
 * Initialize Firebase Admin SDK (singleton pattern).
 * Checks admin.apps.length to avoid multiple initializations.
 * @returns {import('firebase-admin').app.App}
 */
export function initFirebaseApp() {
	if (admin.apps.length > 0) {
		return admin.apps[0];
	}

	const serviceAccountPath = getServiceAccountPath();
	if (!fs.existsSync(serviceAccountPath)) {
		throw new Error(`Service account not found: ${serviceAccountPath}`);
	}

	const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

	// Format private key if needed
	if (serviceAccount.privateKey) {
		serviceAccount.privateKey = formatPrivateKey(serviceAccount.privateKey);
	}

	const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: 'tripphuquoc-db-fs.firebasestorage.app' });

	return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Firestore instance.
 * Automatically initializes Firebase if not already done.
 * @returns {import('firebase-admin').firestore.Firestore}
 */
export function getFirestore() {
	initFirebaseApp();
	return admin.firestore();
}

/**
 * Get Storage bucket instance.
 * Automatically initializes Firebase if not already done.
 * @returns {import('firebase-admin').storage.Bucket}
 */
export function getBucket() {
	initFirebaseApp();
	return admin.storage().bucket();
}

/**
 * Check if a document exists in Firestore.
 * @param {string} collection - Collection name (hotels, tours, activities)
 * @param {string} slug - Document slug/ID to check
 * @returns {Promise<{exists: boolean, id?: string, data?: object}>}
 */
export async function docExists(collection, slug) {
	const db = getFirestore();
	const docRef = db.collection(collection).doc(slug);
	const snapshot = await docRef.get();

	if (snapshot.exists) {
		return { exists: true, id: slug, data: snapshot.data() };
	}
	return { exists: false };
}

/**
 * Set a document in Firestore (create or overwrite).
 * Automatically adds createdAt and updatedAt timestamps.
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {object} data - Document data
 * @returns {Promise<void>}
 */
export async function setDoc(collection, docId, data) {
	const db = getFirestore();

	const docData = { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

	// Only add createdAt if document doesn't exist
	const existing = await db.collection(collection).doc(docId).get();
	if (!existing.exists) {
		docData.createdAt = admin.firestore.FieldValue.serverTimestamp();
	}

	await db.collection(collection).doc(docId).set(docData);
}

// [DEAD CODE] — updateDoc: Never imported by any skill script (save scripts use setDoc instead)
// export async function updateDoc(collection, docId, data) {
//   const db = getFirestore();
//   const updateData = {
//     ...data,
//     updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//   };
//   await db.collection(collection).doc(docId).update(updateData);
// }

// [DEAD CODE] — getDocBySlug: Never imported by any skill script
// export async function getDocBySlug(collection, slug) {
//   const db = getFirestore();
//   const snapshot = await db.collection(collection)
//     .where('slug', '==', slug)
//     .limit(1)
//     .get();
//   if (snapshot.empty) return null;
//   const doc = snapshot.docs[0];
//   return { id: doc.id, data: doc.data() };
// }

/**
 * Set a document in a subcollection.
 * @param {string} parentCollection - Parent collection name (e.g., 'tours')
 * @param {string} parentId - Parent document ID
 * @param {string} subCollection - Subcollection name (e.g., 'tourPricing')
 * @param {string} docId - Document ID in subcollection
 * @param {object} data - Document data
 * @returns {Promise<void>}
 */
export async function setSubcollection(parentCollection, parentId, subCollection, docId, data) {
	const db = getFirestore();

	const docData = { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

	await db.collection(parentCollection).doc(parentId).collection(subCollection).doc(docId).set(docData);
}

/**
 * Get server timestamp field value.
 * @returns {import('firebase-admin').firestore.FieldValue}
 */
export function serverTimestamp() {
	return admin.firestore.FieldValue.serverTimestamp();
}
