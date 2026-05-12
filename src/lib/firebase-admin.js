import { initFirebaseAdmin } from '@9trip/shared/firebase/admin-init';
import { generateNextId } from '@9trip/shared/firebase/admin-helpers';

const { adminDb, adminAuth } = initFirebaseAdmin({ useLazyProxy: true });

export { adminDb, adminAuth, generateNextId };
