/**
 * Firebase Authentication context and helpers.
 * Provides AuthProvider, useAuth hook for the entire app.
 * Supports Email/Password and Social Login (Google, Facebook).
 */
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { app } from "./firebase";
import { getUserProfile, upsertUserProfile } from "./firestore";
import { logger } from '@9trip/shared/logger';

const auth = getAuth(app);
const AuthContext = createContext(null);

/**
 * Forward event to ERP webhook (fire-and-forget, non-blocking).
 * @param {string} event - 'new-customer' | 'update-account'
 * @param {Object} payload - User data
 */
async function forwardToERP(event, payload) {
  try {
    await fetch(`/api/webhooks/erp/${event}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.error(`[forwardToERP] Failed to send ${event}:`, err.message);
  }
}

/**
 * @typedef {Object} AuthUser
 * @property {string} uid
 * @property {string} id
 * @property {string} email
 * @property {string} displayName
 * @property {string} photoURL
 * @property {string} phone
 * @property {string} address
 * @property {string} dateOfBirth
 * @property {string} cccd
 * @property {string} cccdIssueDate
 * @property {string} nationality
 * @property {string[]} wishlist
 */

/**
 * AuthProvider wraps the app to provide auth state.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
          document.cookie = `auth-session=${idToken}; path=/; max-age=3600; SameSite=Lax${isSecure ? '; Secure' : ''}`;
          setUser(firebaseUser); // Only set user if cookie is successfully set
        } catch (tokenErr) {
          logger.error('[Auth] Failed to set session cookie:', tokenErr.message);
          document.cookie = 'auth-session=; path=/; max-age=0; SameSite=Lax';
          await signOut(auth);
          return;
        }
        try {
          const p = await getUserProfile(firebaseUser.uid);
          setProfile(p || { uid: firebaseUser.uid, id: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName });
        } catch {
          setProfile({ uid: firebaseUser.uid, id: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName });
        }
      } else {
        setUser(null);
        document.cookie = 'auth-session=; path=/; max-age=0; SameSite=Lax';
        setProfile(null);
      }
      setLoading(false);
      setInitialized(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
          document.cookie = `auth-session=${idToken}; path=/; max-age=3600; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        } catch (tokenErr) {
          logger.error('[Auth] Failed to refresh session cookie:', tokenErr.message);
          document.cookie = 'auth-session=; path=/; max-age=0; SameSite=Lax';
          await signOut(auth);
        }
      } else {
        document.cookie = 'auth-session=; path=/; max-age=0; SameSite=Lax';
      }
    });
    return unsubscribe;
  }, []);

  /**
   * Sign in with email and password.
   * @param {string} email
   * @param {string} password
   */
  const login = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }, []);

  /**
   * Register new user with email and password.
   * @param {string} email
   * @param {string} password
   * @param {string} displayName
   */
  const register = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const result = await upsertUserProfile(cred.user.uid, { email, displayName });
    // Notify ERP — new customer
    forwardToERP('new-customer', { id: result.id, email, displayName, createdAt: new Date().toISOString() });
    // Send welcome email (fire-and-forget)
    fetch('/api/auth/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userName: displayName }),
    }).catch(err => logger.error('[Auth] Welcome email failed:', err.message));
    return cred.user;
  }, []);

  /**
   * Sign in with Google.
   */
  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const result = await upsertUserProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName,
      avatar: cred.user.photoURL,
    });
    if (result.isNew) {
      fetch('/api/auth/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.user.email, userName: cred.user.displayName }),
      }).catch(err => logger.error('[Auth] Welcome email failed:', err.message));
    }
    forwardToERP('update-account', { id: result.id, email: cred.user.email, displayName: cred.user.displayName, provider: 'google' });
    return cred.user;
  }, []);

  /**
   * Sign in with Facebook.
   */
  const loginWithFacebook = useCallback(async () => {
    const provider = new FacebookAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const result = await upsertUserProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName,
      avatar: cred.user.photoURL,
    });
    if (result.isNew) {
      fetch('/api/auth/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.user.email, userName: cred.user.displayName }),
      }).catch(err => logger.error('[Auth] Welcome email failed:', err.message));
    }
    forwardToERP('update-account', { id: result.id, email: cred.user.email, displayName: cred.user.displayName, provider: 'facebook' });
    return cred.user;
  }, []);

  /**
   * Sign out current user.
   */
  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  /**
   * Send password reset email.
   * @param {string} email
   */
  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  /**
   * Update local profile after editing.
   * @param {Object} data
   */
  const updateProfileData = useCallback(async (data) => {
    if (!user) return;
    const result = await upsertUserProfile(user.uid, data);
    setProfile((prev) => ({ ...prev, ...data }));
    forwardToERP('update-account', { id: result.id || user.uid, ...data });
  }, [user]);

  /**
   * Change password for email/password users.
   * Handles re-authentication if session is stale.
   * Sends email notification on success.
   * @param {string} currentPassword - User's current password
   * @param {string} newPassword - New password (min 6 chars)
   * @returns {Promise<{ success: boolean }>}
   * @throws {Error} With Firebase error message if operation fails
   */
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!user || !user.email) {
      throw new Error("Không có người dùng nào đang đăng nhập.");
    }

    try {
      // Try direct update first
      await updatePassword(user, newPassword);
    } catch (err) {
      // Stale session — need re-authentication
      if (err.code === "auth/requires-recent-login") {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        // Retry after reauth
        await updatePassword(user, newPassword);
      } else {
        // Re-throw other Firebase errors
        throw err;
      }
    }

    // Send email notification (fire-and-forget)
    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "password-changed",
        data: { to: user.email, userName: user.displayName || user.email },
      }),
    }).catch((err) => logger.error("[Auth] Password changed email failed:", err.message));

    return { success: true };
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    initialized,
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    resetPassword,
    updateProfileData,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * @returns {{
 *   user: import("firebase/auth").User|null,
 *   profile: AuthUser|null,
 *   loading: boolean,
 *   login: Function,
 *   register: Function,
 *   loginWithGoogle: Function,
 *   loginWithFacebook: Function,
 *   logout: Function,
 *   resetPassword: Function,
 *   updateProfileData: Function,
 *   changePassword: Function,
 * }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}