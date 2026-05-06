/**
 * Scheduled cleanup tasks.
 * - Release expired inventory holds
 * - Cancel abandoned unpaid bookings
 */

const admin = require("firebase-admin");

/**
 * Release expired inventory holds.
 * Removes holds where expiresAt < now.
 * @param {FirebaseFirestore.Firestore} db
 */
async function cleanupExpiredHolds(db) {
  const now = admin.firestore.Timestamp.now();
  const holdsRef = db.collection("inventory_holds");
  const snapshot = await holdsRef.where("expiresAt", "<", now).get();

  if (snapshot.empty) {
    console.log("[cleanup] No expired inventory holds found");
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[cleanup] Released ${snapshot.size} expired inventory holds`);
}

/**
 * Cancel abandoned unpaid bookings.
 * Marks bookings as "cancelled" if created > 30 minutes ago and still unpaid.
 * @param {FirebaseFirestore.Firestore} db
 */
async function cancelAbandonedBookings(db) {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000); // 30 min ago
  const bookingsRef = db.collection("bookings");
  const snapshot = await bookingsRef
    .where("paymentStatus", "==", "pending")
    .where("createdAt", "<", cutoff)
    .get();

  if (snapshot.empty) {
    console.log("[cleanup] No abandoned bookings found");
    return;
  }

  const batch = db.batch();
  let releasedHolds = 0;

  for (const doc of snapshot.docs) {
    const booking = doc.data();
    batch.update(doc.ref, {
      status: "cancelled",
      paymentStatus: "expired",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelReason: "Abandoned — unpaid after 30 minutes",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Release any associated inventory holds
    if (booking.inventoryHoldId) {
      try {
        const holdRef = db.collection("inventory_holds").doc(booking.inventoryHoldId);
        const holdDoc = await holdRef.get();
        if (holdDoc.exists) {
          batch.delete(holdRef);
          releasedHolds++;
        }
      } catch (err) {
        console.warn(`[cleanup] Failed to release hold ${booking.inventoryHoldId}:`, err);
      }
    }
  }

  await batch.commit();
  console.log(
    `[cleanup] Cancelled ${snapshot.size} abandoned bookings, released ${releasedHolds} inventory holds`
  );
}

module.exports = { cleanupExpiredHolds, cancelAbandonedBookings };
