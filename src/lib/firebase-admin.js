import 'dotenv/config';
import admin from 'firebase-admin';

// ──────────────────────────────────────────────
// 1. Load & validate credentials từ env vars
// ──────────────────────────────────────────────

/**
 * Format private key — Vercel hay escape `\n` thành literal `\\n`.
 * @param {string|undefined} key
 * @returns {string|undefined}
 */
const formatPrivateKey = (key) => {
	if (!key) return undefined;
	return key.replace(/\\n/g, '\n');
};

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
	throw new Error('[firebase-admin] Missing env vars: FIREBASE_ADMIN_PROJECT_ID, ' + 'FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
}

// ──────────────────────────────────────────────
// 2. Initialize (chạy 1 lần)
// ──────────────────────────────────────────────

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert({
			type: 'service_account',
			project_id: projectId,
			private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID || '',
			private_key: privateKey,
			client_email: clientEmail,
			client_id: process.env.FIREBASE_ADMIN_CLIENT_ID || '',
			auth_uri: 'https://accounts.google.com/o/oauth2/auth',
			token_uri: 'https://oauth2.googleapis.com/token',
			auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
			client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
		}),
	});
}

// ──────────────────────────────────────────────
// 3. Export services
// ──────────────────────────────────────────────

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
