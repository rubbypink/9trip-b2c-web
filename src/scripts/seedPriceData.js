/**
 * Seed Price Data Script — Khởi tạo mock data cho 2 collection mới.
 *
 * Tạo dữ liệu mẫu cho:
 * 1. hotel_price_schedules  — bảng giá phòng khách sạn
 * 2. tour_prices            — bảng giá tour
 *
 * Chạy: node src/scripts/seedPriceData.js
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Không tìm thấy service account JSON tại:", serviceAccount);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require(serviceAccount)) });
}
const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random item from an array.
 * @param {Array} arr
 * @returns {*}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Format a Date object as YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
function fmtDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Build period date ranges for the current year.
 * Returns array of { name, startDate, endDate, key }
 */
function buildYearPeriods(year) {
  return [
    { name: "Thấp điểm", key: "p1_low", startDate: `${year}-01-01`, endDate: `${year}-04-30` },
    { name: "Cao điểm", key: "p2_high", startDate: `${year}-05-01`, endDate: `${year}-09-30` },
    { name: "Lễ Tết", key: "p3_peak", startDate: `${year}-10-01`, endDate: `${year}-12-31` },
  ];
}

// ─── 1. Seed hotel_price_schedules ────────────────────────────────────

/**
 * Generate a mock priceData entry for one room.
 * Creates 2-3 rate types × 3 periods with realistic prices.
 * @param {Object} room - Room object from hotel.rooms[]
 * @param {Array} periods - Period definitions from buildYearPeriods()
 * @param {number} basePrice - Base price from hotel.pricing.basePrice or default
 * @returns {Object} priceData map for this room
 */
function generateRoomPriceData(room, periods, basePrice) {
  const roomPriceBase = basePrice || randInt(500000, 3000000);
  const priceData = {};

  // Rate types: standard (base), breakfast (1.25x), all_inclusive (1.6x)
  const rateTypes = [
    { key: "standard", label: "Giá cơ bản", multiplier: 1.0 },
    { key: "breakfast", label: "Bao gồm ăn sáng", multiplier: 1.25 },
    { key: "all_inclusive", label: "Trọn gói", multiplier: 1.6 },
  ];

  // Only use 2 rate types for simpler rooms
  const typesToUse = rateTypes.slice(0, randInt(2, 3));

  for (const rateType of typesToUse) {
    const key = `${room.id}_${rateType.key}`;
    priceData[key] = {};

    for (const period of periods) {
      // Seasonal multiplier: low=1.0, high=1.35, peak=1.7
      let seasonalMultiplier = 1.0;
      if (period.key === "p2_high") seasonalMultiplier = 1.35;
      if (period.key === "p3_peak") seasonalMultiplier = 1.7;

      const sellPrice = Math.round(roomPriceBase * rateType.multiplier * seasonalMultiplier);
      const costPrice = Math.round(sellPrice * 0.7); // 30% margin

      priceData[key][`${period.key}_sup_local`] = {
        startDate: period.startDate,
        endDate: period.endDate,
        supplier: "Local Partner",
        costPrice,
        sellPrice,
      };
    }
  }

  return priceData;
}

/**
 * Seed hotel_price_schedules collection.
 * Reads all hotels, generates one schedule per hotel.
 */
async function seedHotelPriceSchedules() {
  console.log("\n🏨 Seeding hotel_price_schedules...");

  const hotelsSnap = await db.collection("hotels").get();
  if (hotelsSnap.empty) {
    console.log("   ⚠️  No hotels found in Firestore — skipping.");
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;
  const periods = buildYearPeriods(CURRENT_YEAR);

  for (const doc of hotelsSnap.docs) {
    const hotel = doc.data();
    const hotelId = doc.id;
    const docId = `${hotelId}_base_${CURRENT_YEAR}`;

    // Check if already exists
    const existing = await db.collection("hotel_price_schedules").doc(docId).get();
    if (existing.exists) {
      console.log(`   ⏭️  ${docId} — already exists, skipping`);
      skipped++;
      continue;
    }

    const rooms = hotel.rooms || [];
    if (rooms.length === 0) {
      console.log(`   ⚠️  ${hotelId} — no rooms field, skipping`);
      skipped++;
      continue;
    }

    // Build priceData by merging all room price data
    let priceData = {};
    for (const room of rooms) {
      if (!room.isActive) continue;
      const roomPriceData = generateRoomPriceData(room, periods, hotel.pricing?.basePrice || 1500000);
      priceData = { ...priceData, ...roomPriceData };
    }

    const scheduleDoc = {
      id: docId,
      info: {
        hotelId,
        ratePkg: "base",
        year: CURRENT_YEAR,
        status: "actived",
        supplierId: hotel.supplierId || "sup_local",
        viewConfig: {
          periods: periods.map((p) => p.name),
          packages: ["standard", "breakfast", "all_inclusive"],
          priceTypes: ["sellPrice", "costPrice"],
        },
      },
      priceData,
      searchTags: [hotel.name, hotel.address?.city || "", "base", String(CURRENT_YEAR)],
      updated_by: "seed_script",
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    };

    if (DRY_RUN) {
      console.log(`   🧪 [DRY RUN] Would create: ${docId} (${Object.keys(priceData).length} room-rate combos)`);
      created++;
    } else {
      await db.collection("hotel_price_schedules").doc(docId).set(scheduleDoc);
      console.log(`   ✅ Created: ${docId} (${Object.keys(priceData).length} room-rate combos)`);
      created++;
    }
  }

  return { created, skipped };
}

// ─── 3. Seed tour_prices ─────────────────────────────────────────────

/**
 * Generate mock tour pricing with seasonal periods.
 * @param {Object} tour - Tour document data
 * @param {number} baseAdultPrice - Base adult price from tour
 * @returns {Object} Pricing info object
 */
function generateTourPricingInfo(tour, baseAdultPrice) {
  const base = baseAdultPrice || randInt(2000000, 8000000);
  const periods = buildYearPeriods(CURRENT_YEAR);

  return {
    periods: periods.map((p) => {
      let seasonalMultiplier = 1.0;
      if (p.key === "p2_high") seasonalMultiplier = 1.3;
      if (p.key === "p3_peak") seasonalMultiplier = 1.6;

      const adultPrice = Math.round(base * seasonalMultiplier);
      const childPrice = Math.round(adultPrice * 0.7);
      const infantPrice = Math.round(adultPrice * 0.1);
      const singleSupplement = Math.round(adultPrice * 0.3);

      return {
        name: p.name,
        from: p.startDate.slice(5), // "01-01"
        to: p.endDate.slice(5),
        adultPrice,
        childPrice,
        infantPrice,
        singleSupplement,
      };
    }),
  };
}

/**
 * Generate sample bundled services for a tour.
 * References suppliers.
 * @returns {Array<Object>}
 */
function generateTourServices() {
  const possibleServices = [
    { type: "vé_tham_quan", name: "Vé cáp treo Hòn Thơm", supplierId: "sup_vinwonders" },
    { type: "vé_tham_quan", name: "Vé Vinpearl Safari", supplierId: "sup_vinwonders" },
    { type: "ăn_uống", name: "3 bữa trưa + 2 bữa tối", supplierId: "sup_local_transport" },
    { type: "xe_đưa_đón", name: "Xe đưa đón sân bay (7 chỗ)", supplierId: "sup_local_transport" },
    { type: "hướng_dẫn", name: "HDV tiếng Việt 3 ngày", supplierId: "sup_local_guide" },
    { type: "tàu_thuyền", name: "Tàu cao tốc ra đảo khứ hồi", supplierId: "sup_local_transport" },
    { type: "spa", name: "Gói Spa 90 phút", supplierId: "sup_vinpearl" },
    { type: "xe_tham_quan", name: "Xe tham quan 1 ngày (7 chỗ)", supplierId: "sup_local_transport" },
  ];

  // Randomly pick 2-4 services
  const count = randInt(2, 4);
  const shuffled = [...possibleServices].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Seed tour_prices collection.
 * Reads all tours, generates one pricing doc per tour.
 */
async function seedTourPrices() {
  console.log("\n🧳 Seeding tour_prices...");

  const toursSnap = await db.collection("tours").get();
  if (toursSnap.empty) {
    console.log("   ⚠️  No tours found in Firestore — skipping.");
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const doc of toursSnap.docs) {
    const tour = doc.data();
    const tourId = doc.id;
    const docId = tourId; // Use tour ID as document ID

    const existing = await db.collection("tour_prices").doc(docId).get();
    if (existing.exists) {
      console.log(`   ⏭️  ${docId} — already exists, skipping`);
      skipped++;
      continue;
    }

    const baseAdultPrice = tour.pricing?.adultPrice || tour.adultPrice || 4500000;
    const info = generateTourPricingInfo(tour, baseAdultPrice);
    const services = generateTourServices();

    const priceDoc = {
      id: docId,
      tour_id: tourId,
      tour_name: tour.title || tour.name || tourId,
      status: "published",
      info,
      services,
      updated_at: admin.firestore.Timestamp.now(),
    };

    if (DRY_RUN) {
      console.log(`   🧪 [DRY RUN] Would create: ${docId} (${info.periods.length} periods, ${services.length} services)`);
      created++;
    } else {
      await db.collection("tour_prices").doc(docId).set(priceDoc);
      console.log(`   ✅ Created: ${docId} (${info.periods.length} periods, ${services.length} services)`);
      created++;
    }
  }

  return { created, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("🌱 9 Trip — Seed Price Data Script");
  console.log("=".repeat(70));
  console.log(`Mode: ${DRY_RUN ? "🧪 DRY RUN (no writes)" : "✍️  LIVE (will write to Firestore)"}`);
  console.log(`Year: ${CURRENT_YEAR}`);
  console.log();

  const startTime = Date.now();
  const results = {};

  try {
    // Seed all 3 collections
    results.hotel_price_schedules = await seedHotelPriceSchedules();

    results.tour_prices = await seedTourPrices();
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 SEED SUMMARY");
  console.log("=".repeat(70));
  console.log(`Time elapsed: ${elapsed}s`);
  console.log();

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [col, r] of Object.entries(results)) {
    console.log(`   📂 ${col}: ${r.created} created, ${r.skipped} skipped`);
    totalCreated += r.created;
    totalSkipped += r.skipped;
  }

  console.log();
  console.log(`   ✅ Total created: ${totalCreated}`);
  console.log(`   ⏭️  Total skipped (already exist): ${totalSkipped}`);

  if (DRY_RUN) {
    console.log("\n   🧪 DRY RUN — no actual writes were made.");
    console.log("   Run without --dry-run to write data to Firestore.");
  }

  console.log();
}

main().catch(console.error);
