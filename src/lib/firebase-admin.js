import dotenv from 'dotenv';

// Load .env.local in Cloud Functions runtime (does NOT auto-load by default)
// Uses .env as base, then .env.local overrides without clobbering pre-set vars
dotenv.config();
dotenv.config({ path: '.env.local' });

import { initFirebaseAdmin, getAdminDb, getAdminAuth, getAdminStorage } from '@9trip/shared/firebase/admin-init';
import { generateNextId } from '@9trip/shared/firebase/admin-helpers';

const { adminDb, adminAuth } = initFirebaseAdmin({ useLazyProxy: true });

export { adminDb, adminAuth, generateNextId, getAdminDb, getAdminAuth, getAdminStorage };
