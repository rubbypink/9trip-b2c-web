import admin from 'firebase-admin';
import { logger } from '../logger.js';

/**
 * Format private key từ env var — xử lý các edge case phổ biến:
 *   1. Literal "\n" thay vì actual newline (.env single-line)
 *   2. Double-escape "\\n" (Vercel raw editor, JSON config)
 *   3. Surrounding quotes (một số platform wrap env var trong "")
 *   4. Trailing/leading whitespace mỗi dòng PEM
 *
 * @param {string|undefined} key - APP_FIREBASE_PRIVATE_KEY từ process.env
 * @returns {string|undefined} PEM-formatted private key, hoặc undefined
 */
export function formatPrivateKey(key) {
	if (!key) return undefined;

	let cleaned = key.trim();

	// 1. Strip surrounding quotes
	if (
		(cleaned.startsWith('"') && cleaned.endsWith('"')) ||
		(cleaned.startsWith("'") && cleaned.endsWith("'"))
	) {
		cleaned = cleaned.slice(1, -1).trim();
	}

	// 2. Double-escape → single-escape
	cleaned = cleaned.replace(/\\\\n/g, '\\n');

	// 3. Replace literal "\n" → actual newline
	cleaned = cleaned.replace(/\\n/g, '\n');

	// 4. Clean extra whitespace trên từng dòng
	cleaned = cleaned
		.split('\n')
		.map((line) => line.trim())
		.join('\n');

	// 5. Đảm bảo kết thúc bằng 1 newline (chuẩn PEM)
	return cleaned.trimEnd() + '\n';
}

/**
 * Build service account credential từ environment variables.
 * @returns {admin.ServiceAccount|null}
 */
export function getServiceAccount() {
	const projectId =
		process.env.APP_FIREBASE_PROJECT_ID ||
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const clientEmail = process.env.APP_FIREBASE_CLIENT_EMAIL;
	const privateKey = formatPrivateKey(process.env.APP_FIREBASE_PRIVATE_KEY);

	if (!projectId || !clientEmail || !privateKey) {
		logger.warn(
			'[firebase-admin] Thiếu env vars: APP_FIREBASE_PROJECT_ID, APP_FIREBASE_CLIENT_EMAIL, APP_FIREBASE_PRIVATE_KEY',
		);
		return null;
	}

	return {
		type: 'service_account',
		project_id: projectId,
		private_key_id: process.env.APP_FIREBASE_PRIVATE_KEY_ID || '',
		private_key: privateKey,
		client_email: clientEmail,
		client_id: process.env.APP_FIREBASE_CLIENT_ID || '',
		auth_uri: 'https://accounts.google.com/o/oauth2/auth',
		token_uri: 'https://oauth2.googleapis.com/token',
		auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
		client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
	};
}

/**
 * Init Firebase Admin SDK. Hỗ trợ 2 pattern:
 *   - `useLazyProxy: true`  → Next.js pattern: lazy Proxy để tránh lỗi SSR
 *   - `useLazyProxy: false` → Functions pattern: direct init
 *
 * @param {{ useLazyProxy?: boolean }} [options]
 * @returns {{ adminDb: import('firebase-admin/firestore').Firestore, adminAuth: import('firebase-admin/auth').Auth }}
 */
export function initFirebaseAdmin({ useLazyProxy = false } = {}) {
	function ensureAdminInit() {
		if (admin.apps.length) return true;
		try {
			const serviceAccount = getServiceAccount();
			if (serviceAccount) {
				const config = {
					credential: admin.credential.cert(serviceAccount),
				};
				if (useLazyProxy) {
					const storageBucket =
						process.env.APP_FIREBASE_STORAGE_BUCKET ||
						process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
						`${
							process.env.APP_FIREBASE_PROJECT_ID ||
							process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
						}.appspot.com`;
					config.storageBucket = storageBucket;
				}
				admin.initializeApp(config);
				return true;
			}
			// Fallback: GOOGLE_APPLICATION_CREDENTIALS
			if (useLazyProxy) {
				const storageBucket =
					process.env.APP_FIREBASE_STORAGE_BUCKET ||
					process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
					`${
						process.env.APP_FIREBASE_PROJECT_ID ||
						process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
					}.appspot.com`;
				admin.initializeApp({ storageBucket });
			} else {
				admin.initializeApp();
			}
			return true;
		} catch (error) {
			logger.error(
				'[firebase-admin] Lỗi khởi tạo Firebase Admin:',
				error,
			);
			return false;
		}
	}

	if (useLazyProxy) {
		let db = null;
		let auth = null;

		const adminDb = new Proxy(
			{},
			{
				get(_, prop) {
					if (!db) {
						if (!ensureAdminInit()) {
							throw new Error(
								'Firebase Admin not initialized. Set APP_FIREBASE_PROJECT_ID, ' +
									'APP_FIREBASE_CLIENT_EMAIL, APP_FIREBASE_PRIVATE_KEY env vars.',
							);
						}
						db = admin.firestore();
					}
					const value = db[prop];
					return typeof value === 'function' ? value.bind(db) : value;
				},
			},
		);

		const adminAuth = new Proxy(
			{},
			{
				get(_, prop) {
					if (!auth) {
						if (!ensureAdminInit()) {
							throw new Error(
								'Firebase Admin not initialized. Set APP_FIREBASE_PROJECT_ID, ' +
									'APP_FIREBASE_CLIENT_EMAIL, APP_FIREBASE_PRIVATE_KEY env vars.',
							);
						}
						auth = admin.auth();
					}
					const value = auth[prop];
					return typeof value === 'function' ? value.bind(auth) : value;
				},
			},
		);

		return { adminDb, adminAuth };
	}

	ensureAdminInit();
	return { adminDb: admin.firestore(), adminAuth: admin.auth() };
}
