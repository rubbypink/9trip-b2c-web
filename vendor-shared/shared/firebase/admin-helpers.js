// @9trip/shared/firebase/admin-helpers — Firestore Admin SDK serialization & ID generation

/**
 * Convert Admin SDK Firestore types to plain serializable objects.
 * Timestamp → ISO string, GeoPoint → {lat,lng}, DocumentReference → {_ref: path}, Bytes → base64.
 * Deep-walks objects/arrays recursively.
 * @param {*} value
 * @returns {*}
 */
export function serializeAdminDoc(value) {
  if (value === null || value === undefined) return value;

  if (value && typeof value.toDate === 'function' && typeof value.seconds === 'number') {
    return value.toDate().toISOString();
  }

  if (value && typeof value.path === 'string' && typeof value.id === 'string' && typeof value.parent === 'object') {
    return { _ref: value.path };
  }

  if (value && typeof value.latitude === 'number' && typeof value.longitude === 'number' && typeof value.isEqual === 'function') {
    return { lat: value.latitude, lng: value.longitude };
  }

  if (value instanceof Uint8Array) {
    let binary = '';
    for (let i = 0; i < value.length; i++) binary += String.fromCharCode(value[i]);
    return btoa(binary);
  }

  if (value && typeof value.isEqual === 'function' && typeof value._methodName === 'string') {
    return undefined;
  }

  if (Array.isArray(value)) return value.map(serializeAdminDoc);

  if (typeof value === 'object' && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const serialized = serializeAdminDoc(v);
      if (serialized !== undefined) out[k] = serialized;
    }
    return out;
  }

  return value;
}

/**
 * Serialize a Firestore document snapshot to a plain object.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snap
 * @returns {Object}
 */
export function serializeSnap(snap) {
  return serializeAdminDoc({ id: snap.id, ...snap.data() });
}

/**
 * Serialize an array of document snapshots.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap
 * @returns {Object[]}
 */
export function serializeDocs(snap) {
  return snap.docs.map((d) => serializeSnap(d));
}

/**
 * Generate the next sequential ID for a collection (Admin SDK).
 * Uses `counters` collection with Firestore transaction for atomicity.
 * Initializes at 10000 if counter doesn't exist.
 *
 * @param {import('firebase-admin/firestore').Firestore} adminDb - Firestore instance
 * @param {string} colName - Collection name
 * @returns {Promise<string>}
 */
export async function generateNextId(adminDb, colName) {
  const counterRef = adminDb.collection('counters').doc(colName);
  return adminDb.runTransaction(async (transaction) => {
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
}
