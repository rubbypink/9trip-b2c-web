/**
 * Seed Test Pricing Data cho hotels vừa scrape từ booking.com.
 *
 * Hỗ trợ 2 mode:
 *   1. Dynamic mode (CLI args) — dùng cho hotel mới:
 *      node seedTestPricing.js --hotelId={id} --roomSlugs="slug1,slug2" --name="Hotel Name"
 *   2. Static mode — dùng cho hotels hardcode sẵn (giữ ngược compatibility):
 *      node seedTestPricing.js
 *
 * Usage dynamic:
 *   node .agents/skills/booking-scraper/scripts/seedTestPricing.js \
 *     --hotelId=hotel_la-isla-apartments \
 *     --slug=la-isla-apartments \
 *     --name="La isla Apartments" \
 *     --roomSlugs="studio-apartment,one-bedroom-apartment"
 *
 * Usage check-only (kiểm tra xem pricing đã tồn tại chưa):
 *   node .agents/skills/booking-scraper/scripts/seedTestPricing.js \
 *     --checkOnly=true \
 *     --hotelId=hotel_la-isla-apartments
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── CLI Args ─────────────────────────────────────────────────────────

const args = {};
process.argv.slice(2).forEach((arg) => {
  const match = arg.match(/^--(\w+)=(.+)$/);
  if (match) args[match[1]] = match[2];
});

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const serviceAccount = path.resolve(PROJECT_ROOT, "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Service account not found:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccount)),
  });
}
const db = admin.firestore();

const YEAR = 2026;
const SUPPLIER_ID = "sup_booking"; // Mock supplier

// ─── Dynamic Schedule Generator ──────────────────────────────────────

/**
 * Tạo price schedule động từ CLI args.
 * @returns {Object|null} schedule object hoặc null nếu thiếu args
 */
function generateDynamicSchedule() {
  const hotelId = args.hotelId;
  const hotelName = args.name || hotelId;
  const roomSlugs = (args.roomSlugs || "").split(",").filter(Boolean);

  if (!hotelId || roomSlugs.length === 0) {
    return null;
  }

  const scheduleId = `${hotelId}_base_${YEAR}`;
  const priceData = {};

  for (const roomSlug of roomSlugs) {
    const trimmedSlug = roomSlug.trim();
    const key = `${trimmedSlug}_standard`;

    priceData[key] = {
      "low_sup_booking": {
        startDate: "2026-01-01",
        endDate: "2026-04-30",
        supplier: "Booking.com",
        costPrice: 500000,
        sellPrice: 800000,
      },
      "high_sup_booking": {
        startDate: "2026-05-01",
        endDate: "2026-08-31",
        supplier: "Booking.com",
        costPrice: 800000,
        sellPrice: 1200000,
      },
      "peak_sup_booking": {
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        supplier: "Booking.com",
        costPrice: 1200000,
        sellPrice: 1800000,
      },
    };
  }

  return {
    id: scheduleId,
    info: {
      hotelId,
      ratePkg: "base",
      year: YEAR,
      status: "actived",
      supplierId: SUPPLIER_ID,
      viewConfig: {
        periods: ["low", "high", "peak"],
        packages: ["base"],
        priceTypes: ["standard"],
      },
    },
    priceData,
    searchTags: [hotelId, "base-2026", "booking"],
    updated_by: "booking-scraper",
  };
}

/**
 * Kiểm tra xem hotel đã có pricing schedule chưa.
 * @param {string} hotelId
 * @returns {Promise<boolean>}
 */
async function checkExistingPricing(hotelId) {
  const scheduleId = `${hotelId}_base_${YEAR}`;
  const ref = db.collection("hotel_price_schedules").doc(scheduleId);
  const snap = await ref.get();
  return snap.exists;
}

// ─── Pricing Data ─────────────────────────────────────────────────────

/**
 * @typedef {Object} PriceScheduleDef
 * @property {string} id - Document ID format {hotelId}_{ratePkg}_{year}
 * @property {string} hotelId
 * @property {Object} priceData - Nested map per schema
 */

/**
 * Generate price schedule for Rosie Hillside Seaview Phu Quoc Apartment.
 * @returns {PriceScheduleDef}
 */
function rosiePriceSchedule() {
  const hotelId = "hotel_a7c9e4fc";
  const scheduleId = `${hotelId}_base_${YEAR}`;

  // 3 rooms: studio-with-sea-view, apartment-with-sea-view, two-bedroom-apartment-with-balcony
  return {
    id: scheduleId,
    info: {
      hotelId,
      ratePkg: "base",
      year: YEAR,
      status: "actived",
      supplierId: SUPPLIER_ID,
      viewConfig: {
        periods: ["low", "high", "peak"],
        packages: ["base"],
        priceTypes: ["standard"],
      },
    },
    priceData: {
      // Studio with Sea View
      "room_studio-with-sea-view_standard": {
        "low_sup_booking": {
          startDate: "2026-01-01",
          endDate: "2026-04-30",
          supplier: "Booking.com",
          costPrice: 600000,
          sellPrice: 900000,
        },
        "high_sup_booking": {
          startDate: "2026-05-01",
          endDate: "2026-08-31",
          supplier: "Booking.com",
          costPrice: 800000,
          sellPrice: 1200000,
        },
        "peak_sup_booking": {
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          supplier: "Booking.com",
          costPrice: 1000000,
          sellPrice: 1500000,
        },
      },
      // Apartment with Sea View
      "room_apartment-with-sea-view_standard": {
        "low_sup_booking": {
          startDate: "2026-01-01",
          endDate: "2026-04-30",
          supplier: "Booking.com",
          costPrice: 1000000,
          sellPrice: 1500000,
        },
        "high_sup_booking": {
          startDate: "2026-05-01",
          endDate: "2026-08-31",
          supplier: "Booking.com",
          costPrice: 1300000,
          sellPrice: 1900000,
        },
        "peak_sup_booking": {
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          supplier: "Booking.com",
          costPrice: 1600000,
          sellPrice: 2400000,
        },
      },
      // Two-Bedroom Apartment with Balcony
      "room_two-bedroom-apartment-with-balcony_standard": {
        "low_sup_booking": {
          startDate: "2026-01-01",
          endDate: "2026-04-30",
          supplier: "Booking.com",
          costPrice: 1500000,
          sellPrice: 2200000,
        },
        "high_sup_booking": {
          startDate: "2026-05-01",
          endDate: "2026-08-31",
          supplier: "Booking.com",
          costPrice: 1900000,
          sellPrice: 2800000,
        },
        "peak_sup_booking": {
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          supplier: "Booking.com",
          costPrice: 2300000,
          sellPrice: 3500000,
        },
      },
    },
    searchTags: ["rosie-hillside", "phu-quoc", "sunset-town", "base-2026", "booking"],
    updated_by: "booking-scraper",
  };
}

/**
 * Generate price schedule for Vinholidays Fiesta Phu Quoc.
 * @returns {PriceScheduleDef}
 */
function vinholidaysPriceSchedule() {
  const hotelId = "vinholidays-fiesta-phu-quoc";
  const scheduleId = `${hotelId}_base_${YEAR}`;

  return {
    id: scheduleId,
    info: {
      hotelId,
      ratePkg: "base",
      year: YEAR,
      status: "actived",
      supplierId: SUPPLIER_ID,
      viewConfig: {
        periods: ["low", "high", "peak"],
        packages: ["base"],
        priceTypes: ["standard"],
      },
    },
    priceData: {
      // Standard King Bed
      "room_standard-king-bed_standard": {
        "low_sup_booking": {
          startDate: "2026-01-01",
          endDate: "2026-04-30",
          supplier: "Booking.com",
          costPrice: 800000,
          sellPrice: 1200000,
        },
        "high_sup_booking": {
          startDate: "2026-05-01",
          endDate: "2026-08-31",
          supplier: "Booking.com",
          costPrice: 1100000,
          sellPrice: 1600000,
        },
        "peak_sup_booking": {
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          supplier: "Booking.com",
          costPrice: 1400000,
          sellPrice: 2100000,
        },
      },
      // Standard Twin Bed
      "room_standard-twin-bed_standard": {
        "low_sup_booking": {
          startDate: "2026-01-01",
          endDate: "2026-04-30",
          supplier: "Booking.com",
          costPrice: 800000,
          sellPrice: 1200000,
        },
        "high_sup_booking": {
          startDate: "2026-05-01",
          endDate: "2026-08-31",
          supplier: "Booking.com",
          costPrice: 1100000,
          sellPrice: 1600000,
        },
        "peak_sup_booking": {
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          supplier: "Booking.com",
          costPrice: 1400000,
          sellPrice: 2100000,
        },
      },
      // Studio Suite King Bed
      "room_studio-suite-king-bed_standard": {
        "low_sup_booking": {
          startDate: "2026-01-01",
          endDate: "2026-04-30",
          supplier: "Booking.com",
          costPrice: 1100000,
          sellPrice: 1600000,
        },
        "high_sup_booking": {
          startDate: "2026-05-01",
          endDate: "2026-08-31",
          supplier: "Booking.com",
          costPrice: 1400000,
          sellPrice: 2100000,
        },
        "peak_sup_booking": {
          startDate: "2026-09-01",
          endDate: "2026-12-31",
          supplier: "Booking.com",
          costPrice: 1800000,
          sellPrice: 2700000,
        },
      },
    },
    searchTags: ["vinholidays-fiesta", "vinpearl", "phu-quoc", "ganh-dau", "base-2026", "booking"],
    updated_by: "booking-scraper",
  };
}

// ─── Save ─────────────────────────────────────────────────────────────

/**
 * Save one price schedule document.
 * Deletes existing doc first if present, then creates new one.
 * @param {Object} schedule
 */
async function saveSchedule(schedule) {
  const ref = db.collection("hotel_price_schedules").doc(schedule.id);

  // Check & delete existing
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`   🗑️  Deleting existing: ${schedule.id}`);
    await ref.delete();
  }

  // Write
  await ref.set({
    ...schedule,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`   ✅ Created: ${schedule.id}`);
  return schedule.id;
}

/**
 * Print summary of a schedule.
 * @param {Object} schedule
 */
function printSummary(schedule) {
  const hotelName = schedule.info.hotelId === "hotel_a7c9e4fc"
    ? "Rosie Hillside Seaview Phu Quoc Apartment"
    : "Vinholidays Fiesta Phu Quoc";

  console.log(`\n🏨 ${hotelName}`);
  console.log(`   Schedule: ${schedule.id}`);
  console.log(`   Rooms in priceData: ${Object.keys(schedule.priceData).length}`);

  for (const [key, periods] of Object.entries(schedule.priceData)) {
    const periodCount = Object.keys(periods).length;
    const samplePrice = periods[Object.keys(periods)[0]]?.sellPrice || 0;
    console.log(`      - ${key}: ${periodCount} periods, from ${samplePrice.toLocaleString()} VND`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  💰 Seed Test Pricing Data — hotel_price_schedules");
  console.log(`  📅 Year: ${YEAR}`);
  console.log("=".repeat(60));
  console.log("");

  // ── Dynamic mode (từ CLI args) ───────────────────────────────────
  const dynamicSchedule = generateDynamicSchedule();
  const isCheckOnly = args.checkOnly === "true";

  if (dynamicSchedule) {
    const hotelId = args.hotelId;
    const hotelName = args.name || hotelId;
    const roomCount = (args.roomSlugs || "").split(",").filter(Boolean).length;

    // Check-only mode
    if (isCheckOnly) {
      const exists = await checkExistingPricing(hotelId);
      if (exists) {
        console.log(`   ℹ️  Pricing already exists for: ${hotelId}`);
        console.log(`   ✅ Check result: EXISTS — no action needed`);
      } else {
        console.log(`   ℹ️  No pricing found for: ${hotelId}`);
        console.log(`   ✅ Check result: MISSING — seed required`);
      }
      console.log("\n" + "=".repeat(60));
      process.exit(exists ? 0 : 1);
    }

    // Seed mode
    console.log(`🏨 Dynamic: ${hotelName} (${hotelId})`);
    console.log(`   Rooms: ${roomCount}`);
    console.log("");
    printSummary(dynamicSchedule);
    console.log("\n─── Saving to Firestore ──────────────────────────────────\n");
    await saveSchedule(dynamicSchedule);

    console.log("\n" + "=".repeat(60));
    console.log("  ✅ DONE — Pricing data seeded successfully");
    console.log(`  📦 1 schedule created for: ${hotelId}`);
    console.log("=".repeat(60));
    process.exit(0);
  }

  // ── Static mode (hardcoded schedules) ────────────────────────────
  const schedules = [rosiePriceSchedule(), vinholidaysPriceSchedule()];

  console.log("🏨 Static mode — using hardcoded schedules:\n");

  for (const schedule of schedules) {
    printSummary(schedule);
  }

  console.log("\n─── Saving to Firestore ──────────────────────────────────\n");

  for (const schedule of schedules) {
    await saveSchedule(schedule);
  }

  console.log("\n" + "=".repeat(60));
  console.log("  ✅ DONE — Pricing data seeded successfully");
  console.log(`  📦 ${schedules.length} schedules created`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
