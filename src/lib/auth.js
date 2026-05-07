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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { app } from "./firebase";
import { getUserProfile, upsertUserProfile } from "./firestore";

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
  } catch {
    // Fire-and-forget — không xử lý lỗi, không chặn UX
  }
}

/**
 * @typedef {Object} AuthUser
 * @property {string} uid
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Sync cookie cho middleware — defense-in-depth
        document.cookie = `auth-session=1; path=/; max-age=86400; SameSite=Lax`;
        try {
          const p = await getUserProfile(firebaseUser.uid);
          setProfile(p || { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName });
        } catch {
          setProfile({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName });
        }
      } else {
        // Clear cookie khi logout
        document.cookie = 'auth-session=; path=/; max-age=0; SameSite=Lax';
        setProfile(null);
      }
      setLoading(false);
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
    await upsertUserProfile(cred.user.uid, { email, displayName });
    // Notify ERP — new customer
    forwardToERP('new-customer', { id: cred.user.uid, email, displayName, createdAt: new Date().toISOString() });
    // Send welcome email (fire-and-forget)
    fetch('/api/auth/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userName: displayName }),
    }).catch(() => {});
    return cred.user;
  }, []);

  /**
   * Sign in with Google.
   */
  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await upsertUserProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName,
      avatar: cred.user.photoURL,
    });
    forwardToERP('update-account', { id: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, provider: 'google' });
    return cred.user;
  }, []);

  /**
   * Sign in with Facebook.
   */
  const loginWithFacebook = useCallback(async () => {
    const provider = new FacebookAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await upsertUserProfile(cred.user.uid, {
      email: cred.user.email,
      displayName: cred.user.displayName,
      avatar: cred.user.photoURL,
    });
    forwardToERP('update-account', { id: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, provider: 'facebook' });
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
    await upsertUserProfile(user.uid, data);
    setProfile((prev) => ({ ...prev, ...data }));
    forwardToERP('update-account', { id: user.uid, ...data });
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    resetPassword,
    updateProfileData,
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
 * }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}