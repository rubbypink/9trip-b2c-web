import admin from 'firebase-admin';
import { logger } from './logger';

// Hàm xử lý parse private key do Vercel hay bị lỗi vụ dấu \n
const formatPrivateKey = (key) => {
	if (!key) return undefined;
	return key.replace(/\\n/g, '\n');
};

// Khởi tạo Admin SDK, kiểm tra để tránh khởi tạo nhiều lần
if (!admin.apps.length) {
	try {
		admin.initializeApp({ credential: admin.credential.cert(require(serviceAccount)) });
	} catch (error) {
		logger.error('Lỗi khởi tạo Firebase Admin:', error);
	}
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
