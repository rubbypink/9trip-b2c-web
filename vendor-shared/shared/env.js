/**
 * Environment variable resolution helpers.
 * Shared between Next.js and Cloud Functions.
 * Both platforms auto-load .env.local — no dotenv needed.
 */

/**
 * Get an environment variable with optional fallback.
 * @param {string} key - Environment variable name
 * @param {string} [fallback] - Default value if not set
 * @returns {string|undefined}
 */
export function getEnvVar(key, fallback) {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  return undefined;
}

/**
 * Get a required environment variable. Throws if missing.
 * @param {string} key - Environment variable name
 * @returns {string}
 */
export function getRequiredEnvVar(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get Firebase client config from environment variables.
 * @returns {Object} Firebase client config object
 */
export function getFirebaseConfig() {
  return {
    apiKey: getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID'),
  };
}

/**
 * Get Firebase Admin credentials from environment variables.
 * @returns {Object} Service account object for firebase-admin
 */
export function getAdminCredentials() {
	const clientEmail = getRequiredEnvVar('APP_FIREBASE_CLIENT_EMAIL');
	return {
		type: 'service_account',
		project_id: getRequiredEnvVar('APP_FIREBASE_PROJECT_ID'),
		private_key_id: getRequiredEnvVar('APP_FIREBASE_PRIVATE_KEY_ID'),
		private_key: getRequiredEnvVar('APP_FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
		client_email: clientEmail,
		client_id: getRequiredEnvVar('APP_FIREBASE_CLIENT_ID'),
		auth_uri: 'https://accounts.google.com/o/oauth2/auth',
		token_uri: 'https://oauth2.googleapis.com/token',
		auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
		client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
	};
}
