import admin from 'firebase-admin';
import { logger } from './logger';

/**
 * Format private key từ env var (Vercel hay escape \n thành literal "\n").
 * @param {string|undefined} key
 * @returns {string|undefined}
 */
const formatPrivateKey = (key) => {
	if (!key) return undefined;
	return key.replace(/\\n/g, '\n');
};

/**
 * Build service account credential từ environment variables.
 * Chuẩn cho Vercel — không cần file JSON local.
 * @returns {admin.ServiceAccount|null}
 */
function getServiceAccount() {
	const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

	if (!projectId || !clientEmail || !privateKey) {
		logger.warn('[firebase-admin] Thiếu env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY');
		return null;
	}

	return {
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
	};
}

/**
 * Init Firebase Admin SDK. Chỉ gọi 1 lần.
 * @returns {boolean} true nếu init thành công
 */
function ensureAdminInit() {
	if (admin.apps.length) return true;
	try {
		const serviceAccount = getServiceAccount();
		if (serviceAccount) {
			admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
			return true;
		}
		// Fallback: GOOGLE_APPLICATION_CREDENTIALS (ko dùng trên Vercel)
		admin.initializeApp();
		return true;
	} catch (error) {
		logger.error('[firebase-admin] Lỗi khởi tạo Firebase Admin:', error);
		return false;
	}
}

/**
 * Lazy getter cho Firestore Admin instance.
 * Tránh lỗi module evaluation khi env vars chưa được set.
 */
function getAdminDb() {
	if (!ensureAdminInit()) return null;
	return admin.firestore();
}

/**
 * Lazy getter cho Auth Admin instance.
 */
function getAdminAuth() {
	if (!ensureAdminInit()) return null;
	return admin.auth();
}

/**
 * Create a lazy Proxy cho Firestore Admin instance.
 * Chỉ khởi tạo khi lần đầu tiên được truy cập (lúc request, không phải module eval).
 * @returns {import('firebase-admin/firestore').Firestore}
 */
function createFirestoreProxy() {
	let db = null;
	return new Proxy(
		{},
		{
			get(_, prop) {
				if (!db) {
					if (!ensureAdminInit()) {
						throw new Error('Firebase Admin not initialized. Set FIREBASE_ADMIN_PROJECT_ID, ' + 'FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY env vars.');
					}
					db = admin.firestore();
				}
				const value = db[prop];
				return typeof value === 'function' ? value.bind(db) : value;
			},
		},
	);
}

/**
 * Create a lazy Proxy cho Firebase Auth Admin instance.
 */
function createAuthProxy() {
	let auth = null;
	return new Proxy(
		{},
		{
			get(_, prop) {
				if (!auth) {
					if (!ensureAdminInit()) {
						throw new Error('Firebase Admin not initialized. Set FIREBASE_ADMIN_PROJECT_ID, ' + 'FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY env vars.');
					}
					auth = admin.auth();
				}
				const value = auth[prop];
				return typeof value === 'function' ? value.bind(auth) : value;
			},
		},
	);
}

export const adminDb = createFirestoreProxy();
export const adminAuth = createAuthProxy();
