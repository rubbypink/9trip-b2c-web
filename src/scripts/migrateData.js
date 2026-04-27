/**
 * Data Migration Script — Chuẩn hóa cấu trúc dữ liệu Firestore.
 *
 * Phát hiện từ diagnostic:
 *   - Hotels: dùng minPrice, ratingAverage, ratingCount, title — không khớp schema
 *   - Tours: dùng pricing.adultPrice — cần verify schema match
 *   - Activities: hybrid data (adultPrice vs basePrice)
 *
 * Chạy DRY-RUN: node src/scripts/migrateData.js --dry-run
 * Chạy thật:    node src/scripts/migrateData.js --migrate
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");
if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Service account not found");
  process.exit(1);
}
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require(serviceAccount)) });
}
const db = admin.firestore();

const DRY_RUN = process.argv.includes("--dry-run");
const DO_MIGRATE = process.argv.includes("--migrate");

if (!DRY_RUN && !DO_MIGRATE) {
  console.log("ℹ️  DRY-RUN mode — không ghi vào Firestore.");
  console.log("   Để migrate thật: node src/scripts/migrateData.js --migrate");
  console.log();
}

// ─── Migration Rules ─────────────────────────────────────────────────

const MIGRATIONS = [
  // Hotels: migrate field structure
  {
    collection: "hotels",
    transform: (doc, data) => {
      const updates = {};
      let needsUpdate = false;

      // title → name
      if (data.title && !data.name) {
        updates.name = data.title;
        needsUpdate = true;
      }

      // minPrice → pricing.basePrice
      if (data.minPrice != null) {
        updates["pricing.basePrice"] = Number(data.minPrice);
        needsUpdate = true;
        // Also ensure pricing exists
        if (!data.pricing) {
          updates["pricing.currency"] = "VND";
        }
      }

      // ratingAverage, ratingCount → rating.average, rating.count
      if (data.ratingAverage != null) {
        updates["rating.average"] = Number(data.ratingAverage);
        needsUpdate = true;
      }
      if (data.ratingCount != null) {
        updates["rating.count"] = Number(data.ratingCount);
        needsUpdate = true;
      }

      // checkInOut → policies
      if (data.checkInOut) {
        const checkStr = String(data.checkInOut);
        if (checkStr.includes("check-in") || checkStr.toLowerCase().includes("nhận")) {
          updates["policies.checkIn"] = checkStr;
        }
        if (checkStr.includes("check-out") || checkStr.toLowerCase().includes("trả")) {
          updates["policies.checkOut"] = checkStr;
        }
        needsUpdate = true;
      }

      // hotelType, facilities → amenities
      if (data.facilities && Array.isArray(data.facilities)) {
        updates.amenities = data.facilities;
        needsUpdate = true;
      }

      return needsUpdate ? updates : null;
    },
  },

  // Tours: standardize pricing structure
  {
    collection: "tours",
    transform: (doc, data) => {
      const updates = {};
      let needsUpdate = false;

      // Ensure pricing has all required fields
      if (data.pricing) {
        if (data.pricing.adultPrice != null && data.pricing.basePrice == null) {
          updates["pricing.basePrice"] = Number(data.pricing.adultPrice);
          needsUpdate = true;
        }
        if (!data.pricing.currency) {
          updates["pricing.currency"] = "VND";
          needsUpdate = true;
        }
      }

      // ratingAverage → rating.average
      if (data.ratingAverage != null) {
        updates["rating.average"] = Number(data.ratingAverage);
        needsUpdate = true;
      }
      if (data.ratingCount != null) {
        updates["rating.count"] = Number(data.ratingCount);
        needsUpdate = true;
      }

      return needsUpdate ? updates : null;
    },
  },

  // Activities: standardize pricing
  {
    collection: "activities",
    transform: (doc, data) => {
      const updates = {};
      let needsUpdate = false;

      if (data.pricing) {
        // If has adultPrice but no basePrice
        if (data.pricing.adultPrice != null && data.pricing.basePrice == null) {
          updates["pricing.basePrice"] = Number(data.pricing.adultPrice);
          needsUpdate = true;
        }
        // If has basePrice but no adultPrice
        if (data.pricing.basePrice != null && data.pricing.adultPrice == null) {
          updates["pricing.adultPrice"] = Number(data.pricing.basePrice);
          needsUpdate = true;
        }
        if (!data.pricing.currency) {
          updates["pricing.currency"] = "VND";
          needsUpdate = true;
        }
      }

      // ratingAverage, ratingCount → rating.average, .count
      if (data.ratingAverage != null) {
        updates["rating.average"] = Number(data.ratingAverage);
        needsUpdate = true;
      }
      if (data.ratingCount != null) {
        updates["rating.count"] = Number(data.ratingCount);
        needsUpdate = true;
      }

      return needsUpdate ? updates : null;
    },
  },

  // Cars: standardize
  {
    collection: "cars",
    transform: (doc, data) => {
      const updates = {};
      let needsUpdate = false;

      if (data.pricing) {
        if (data.pricing.basePrice == null) {
          // Try to extract price from title or set default
          updates["pricing.basePrice"] = 0;
          needsUpdate = true;
        }
        if (!data.pricing.currency) {
          updates["pricing.currency"] = "VND";
          needsUpdate = true;
        }
      }

      return needsUpdate ? updates : null;
    },
  },
];

// ─── Migration Runner ─────────────────────────────────────────────────

async function runMigration() {
  console.log("=".repeat(70));
  console.log(DRY_RUN ? "🧪 Data Migration — DRY-RUN" : "🚀 Data Migration");
  console.log("=".repeat(70));
  console.log();

  const results = [];

  for (const migration of MIGRATIONS) {
    const { collection, transform } = migration;
    console.log(`📂 Processing ${collection}...`);

    try {
      const snapshot = await db.collection(collection).get();
      console.log(`   Documents: ${snapshot.size}`);

      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = transform(doc, data);

        if (!updates) {
          skipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`   📄 [DRY-RUN] ${collection}/${doc.id}:`);
          Object.entries(updates).forEach(([field, value]) => {
            console.log(`       ${field}: ${JSON.stringify(value)}`);
          });
          migrated++;
          continue;
        }

        try {
          await db.collection(collection).doc(doc.id).update(updates);
          console.log(`   ✅ ${collection}/${doc.id}: Updated ${Object.keys(updates).length} fields`);
          migrated++;
        } catch (error) {
          console.error(`   ❌ ${collection}/${doc.id}: ${error.message}`);
          errors++;
        }
      }

      results.push({ collection, total: snapshot.size, migrated, skipped, errors });
    } catch (error) {
      console.error(`   ❌ Error accessing ${collection}: ${error.message}`);
      results.push({ collection, total: 0, migrated: 0, skipped: 0, errors: 1, error: error.message });
    }

    console.log();
  }

  // Summary
  console.log("=".repeat(70));
  if (DRY_RUN) {
    console.log("🧪 DRY-RUN COMPLETE");
  } else if (DO_MIGRATE) {
    console.log("✅ MIGRATION COMPLETE");
  }
  console.log("-".repeat(70));
  console.log("Collection          | Total | Migrated | Skipped | Errors");
  console.log("-".repeat(70));
  for (const r of results) {
    console.log(`${r.collection.padEnd(18)} | ${String(r.total).padStart(5)} | ${String(r.migrated).padStart(8)} | ${String(r.skipped).padStart(7)} | ${String(r.errors).padStart(6)}`);
  }
  console.log("-".repeat(70));
}

runMigration().catch(console.error);
