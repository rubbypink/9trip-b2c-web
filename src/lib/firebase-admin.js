import admin from 'firebase-admin';
import { logger } from './logger';

/**
 * Format private key từ env var — xử lý các edge case phổ biến:
 *   1. Literal "\n" thay vì actual newline (Vercel, Render, .env single-line)
 *   2. Double-escape "\\n" (Vercel raw editor, JSON config)
 *   3. Surrounding quotes (một số platform wrap env var trong "")
 *   4. Trailing/leading whitespace mỗi dòng PEM
 *
 * Lỗi `error:1E08010C:DECODER routines::unsupported` từ OpenSSL xảy ra khi
 * google-auth-library cố ký JWT với private key sai định dạng PEM.
 *
 * @param {string|undefined} key - FIREBASE_PRIVATE_KEY từ process.env
 * @returns {string|undefined} PEM-formatted private key, hoặc undefined
 */
const formatPrivateKey = (key) => {
	if (!key) return undefined;

	let cleaned = key.trim();

	// 1. Strip surrounding quotes (phổ biến khi env var được wrap trong "")
	if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
		(cleaned.startsWith("'") && cleaned.endsWith("'"))) {
		cleaned = cleaned.slice(1, -1).trim();
	}

	// 2. Double-escape → single-escape (VD: Vercel raw editor lưu "\\n" thành "\\\\n")
	cleaned = cleaned.replace(/\\\\n/g, '\\n');

	// 3. Replace literal "\n" → actual newline (trường hợp phổ biến nhất)
	cleaned = cleaned.replace(/\\n/g, '\n');

	// 4. Clean extra whitespace trên từng dòng (giữ nguyên cấu trúc PEM)
	cleaned = cleaned.split('\n')
		.map((line) => line.trim())
		.join('\n');

	// 5. Đảm bảo kết thúc bằng 1 newline (chuẩn PEM)
	return cleaned.trimEnd() + '\n';
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
    logger.warn('[firebase-admin] Thiếu env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
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

/**
 * Generate next sequential ID for a Firestore collection.
 * Uses a `counters/{colName}` document to track the sequence.
 * Starts from 10000 if no counter exists.
 *
 * @param {string} colName - Collection name
 * @returns {Promise<string>} Next sequential ID as string (e.g., "10000")
 */
export async function generateNextId(colName) {
  try {
    const counterRef = adminDb.collection('counters').doc(colName);
    const nextId = await adminDb.runTransaction(async (transaction) => {
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
    return nextId;
  } catch (error) {
    logger.error(`[generateNextId] Error for ${colName}:`, error.message);
    throw error;
  }
}

export const adminDb = createFirestoreProxy();
export const adminAuth = createAuthProxy();
