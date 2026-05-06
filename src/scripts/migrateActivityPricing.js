const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("Missing service account key:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccount)),
  });
}

const db = admin.firestore();

async function migrateActivityPricing() {
  console.log("🚀 Starting Activity Pricing Migration...");
  
  const activitiesSnap = await db.collection("activities").get();
  console.log(`Found ${activitiesSnap.size} activities to process.`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of activitiesSnap.docs) {
    const activityId = doc.id;
    const data = doc.data();

    try {
      console.log(`\nProcessing activity: ${activityId}`);

      // Check if it already has the new schema (pricing is object and has tiers)
      if (data.pricing && Array.isArray(data.pricing.tiers)) {
        console.log(`   ⏭️ Already migrated.`);
        skipped++;
        continue;
      }

      // Fetch existing subcollection
      const pricingCol = db.collection("activities").doc(activityId).collection("activityPricing");
      const pricingSnap = await pricingCol.get();

      let tiers = [];
      let basePrice = data.pricing?.basePrice || data.pricing?.adultPrice || 0;
      let currency = data.pricing?.currency || "VND";

      if (!pricingSnap.empty) {
        // Collect tiers from subcollection
        pricingSnap.docs.forEach((pDoc) => {
          const pData = pDoc.data();
          tiers.push({
            id: pData.id || pDoc.id,
            name: pData.name || "",
            description: pData.description || "",
            adultPrice: pData.adultPrice || 0,
            childPrice: pData.childPrice || 0,
            currency: pData.currency || "VND",
            discountPercent: pData.discountPercent || 0,
            included: pData.included || [],
          });
        });

        // Find the lowest adultPrice for basePrice
        const validPrices = tiers.map(t => t.adultPrice).filter(p => p > 0);
        if (validPrices.length > 0) {
          basePrice = Math.min(...validPrices);
        }
      } else if (data.pricing && typeof data.pricing === "object" && !data.pricing.basePrice) {
         // Attempt to parse MAP format (old Hybrid ERP sync)
         const mapKeys = Object.keys(data.pricing);
         if (mapKeys.length > 0) {
            tiers = mapKeys.map(k => {
               const pData = data.pricing[k];
               return {
                  id: k,
                  name: pData.name || k,
                  description: pData.description || "",
                  adultPrice: pData.adultPrice || pData.basePrice || 0,
                  childPrice: pData.childPrice || 0,
                  currency: pData.currency || "VND",
                  discountPercent: pData.discountPercent || 0,
                  included: pData.included || []
               };
            });
            const validPrices = tiers.map(t => t.adultPrice).filter(p => p > 0);
            if (validPrices.length > 0) {
              basePrice = Math.min(...validPrices);
            }
         }
      }

      // If no tiers found but has root price, make a default tier
      if (tiers.length === 0 && basePrice > 0) {
        tiers.push({
          id: "default_tier",
          name: "Vé tiêu chuẩn",
          description: "",
          adultPrice: basePrice,
          childPrice: data.pricing?.childPrice || 0,
          currency: currency,
          discountPercent: 0,
          included: []
        });
      }

      // Build new pricing object
      const newPricing = {
        basePrice: basePrice,
        adultPrice: data.pricing?.adultPrice || basePrice,
        childPrice: data.pricing?.childPrice || 0,
        currency: currency,
        tiers: tiers
      };

      // Update document
      await db.collection("activities").doc(activityId).update({
        pricing: newPricing
      });

      console.log(`   ✅ Migrated with ${tiers.length} tiers. BasePrice: ${basePrice}`);

      // Delete old subcollection if exists
      if (!pricingSnap.empty) {
        const batch = db.batch();
        pricingSnap.docs.forEach((pDoc) => {
          batch.delete(pDoc.ref);
        });
        await batch.commit();
        console.log(`   🧹 Deleted ${pricingSnap.size} docs from activityPricing subcollection.`);
      }

      migrated++;
    } catch (err) {
      console.error(`   ❌ Error processing ${activityId}:`, err);
      errors++;
    }
  }

  console.log(`\n🎉 Migration Complete!`);
  console.log(`- Migrated: ${migrated}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Errors: ${errors}`);
  process.exit(0);
}

migrateActivityPricing();
