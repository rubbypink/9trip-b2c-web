import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup, FacebookAuthProvider } from 'firebase/auth';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

/**
 * Đăng ký tài khoản email/password
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function registerWithEmail(email, password, displayName) {
	const cred = await createUserWithEmailAndPassword(auth, email, password);
	if (displayName) {
		await updateProfile(cred.user, { displayName });
	}
	return cred;
}

/**
 * Đăng nhập email/password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function loginWithEmail(email, password) {
	return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Đăng nhập Google
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function loginWithGoogle() {
	const provider = new GoogleAuthProvider();
	provider.setCustomParameters({ prompt: 'select_account' });
	return signInWithPopup(auth, provider);
}

/**
 * Đăng nhập Facebook
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export async function loginWithFacebook() {
	const provider = new FacebookAuthProvider();
	provider.setCustomParameters({ display: 'popup' });
	return signInWithPopup(auth, provider);
}

/**
 * Đăng xuất
 * @returns {Promise<void>}
 */
export async function logout() {
	return signOut(auth);
}

/**
 * Theo dõi trạng thái auth
 * @param {(user: import("firebase/auth").User|null) => void} callback
 * @returns {import("firebase/auth").Unsubscribe}
 */
export function onAuthChange(callback) {
	return onAuthStateChanged(auth, callback);
}

export { auth };
