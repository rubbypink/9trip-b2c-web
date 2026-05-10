const admin = require("firebase-admin");
const serviceAccount = require("./tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getBooking() {
  const docRef = db.collection('bookings').doc('pcEGgsFN3HZ46spfEHFD');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', JSON.stringify(doc.data(), null, 2));
  }
  process.exit(0);
}

getBooking().catch(console.error);
