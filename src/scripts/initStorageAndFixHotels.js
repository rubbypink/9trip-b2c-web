/**
 * Initialize Firebase Storage structure + fix hotels missing rooms field.
 *
 * 1. Adds mock rooms to hotels that don't have the embedded `rooms` field yet
 * 2. Creates a tiny placeholder WebP marker in Storage for each hotel/tour
 *    to establish the directory structure.
 * 3. Re-runs seedPriceData for the newly-fixed hotels.
 *
 * Chạy: node src/scripts/initStorageAndFixHotels.js
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Init Firebase ────────────────────────────────────────────────────

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");
if (!fs.existsSync(serviceAccount)) { console.error("❌ Missing service account"); process.exit(1); }
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(require(serviceAccount)), storageBucket: "tripphuquoc-db-fs.firebasestorage.app" }); }
const db = admin.firestore();
const storage = admin.storage();

const bucket = storage.bucket();
const CURRENT_YEAR = new Date().getFullYear();

// ─── 1×1 transparent WebP (valid minimal WebP file) ───────────────────
// This is a real, valid 1×1 pixel transparent WebP image encoded as base64.
const TINY_WEBP_BASE64 =
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAD8D+JaQAA3AA/vpUAAA=";
const TINY_WEBP_BUFFER = Buffer.from(TINY_WEBP_BASE64, "base64");

// ─── Mock rooms templates ─────────────────────────────────────────────

function makeRoomsForHotel(hotel) {
  const starRating = hotel.starRating || 4;
  const basePrice = hotel.pricing?.basePrice || hotel.minPrice || 1500000;

  if (starRating >= 5) {
    return [
      { id: "room_deluxe_ocean", name: "Deluxe Ocean View", slug: "deluxe-ocean-view", description: "<p>Phòng Deluxe hướng biển sang trọng.</p>", featuredImage: "", gallery: [], bedType: "1 giường King", maxAdults: 2, maxChildren: 1, maxGuests: 3, roomSize: 35, amenities: ["Điều hòa","TV 55\"","Wifi","Minibar","Bồn tắm","Ban công"], included: ["Bữa sáng"], totalRooms: 10, isActive: true, sortOrder: 1 },
      { id: "room_suite_presidential", name: "Presidential Suite", slug: "presidential-suite", description: "<p>Suite Tổng thống với phòng khách riêng.</p>", featuredImage: "", gallery: [], bedType: "1 giường King", maxAdults: 2, maxChildren: 2, maxGuests: 4, roomSize: 80, amenities: ["Điều hòa","TV 65\"","Wifi","Minbar","Bồn tắm Jacuzzi","Phòng khách","Ban công rộng"], included: ["Bữa sáng","Mini bar","Đưa đón sân bay"], totalRooms: 2, isActive: true, sortOrder: 2 },
      { id: "room_deluxe_garden", name: "Deluxe Garden View", slug: "deluxe-garden-view", description: "<p>Phòng Deluxe view vườn yên tĩnh.</p>", featuredImage: "", gallery: [], bedType: "2 giường Đơn", maxAdults: 2, maxChildren: 2, maxGuests: 4, roomSize: 32, amenities: ["Điều hòa","TV","Wifi","Minibar"], included: ["Bữa sáng"], totalRooms: 8, isActive: true, sortOrder: 3 },
    ];
  } else if (starRating >= 4) {
    return [
      { id: "room_deluxe_city", name: "Deluxe City View", slug: "deluxe-city-view", description: "<p>Phòng Deluxe hướng thành phố.</p>", featuredImage: "", gallery: [], bedType: "1 giường King", maxAdults: 2, maxChildren: 1, maxGuests: 3, roomSize: 28, amenities: ["Điều hòa","TV","Wifi","Minibar"], included: [], totalRooms: 8, isActive: true, sortOrder: 1 },
      { id: "room_superior", name: "Superior Room", slug: "superior-room", description: "<p>Phòng Superior tiêu chuẩn.</p>", featuredImage: "", gallery: [], bedType: "1 giường Queen", maxAdults: 2, maxChildren: 0, maxGuests: 2, roomSize: 22, amenities: ["Điều hòa","TV","Wifi"], included: [], totalRooms: 10, isActive: true, sortOrder: 2 },
    ];
  } else {
    return [
      { id: "room_standard", name: "Phòng Standard", slug: "phong-standard", description: "<p>Phòng tiêu chuẩn giá tốt.</p>", featuredImage: "", gallery: [], bedType: "1 giường Queen", maxAdults: 2, maxChildren: 0, maxGuests: 2, roomSize: 20, amenities: ["Điều hòa","TV","Wifi"], included: [], totalRooms: 12, isActive: true, sortOrder: 1 },
      { id: "room_deluxe", name: "Phòng Deluxe", slug: "phong-deluxe", description: "<p>Phòng Deluxe rộng hơn, đầy đủ tiện nghi.</p>", featuredImage: "", gallery: [], bedType: "1 giường King", maxAdults: 2, maxChildren: 1, maxGuests: 3, roomSize: 26, amenities: ["Điều hòa","TV","Wifi","Minibar","Bồn tắm"], included: ["Bữa sáng"], totalRooms: 6, isActive: true, sortOrder: 2 },
    ];
  }
}

// ─── Phase 1: Fix hotels without rooms ────────────────────────────────

async function fixHotelsWithoutRooms() {
  console.log("🏨 Phase 1: Fixing hotels without embedded rooms field...\n");

  const hotelsSnap = await db.collection("hotels").get();
  let fixed = 0;

  for (const doc of hotelsSnap.docs) {
    const hotel = doc.data();
    if (hotel.rooms && hotel.rooms.length > 0) continue; // Already has rooms

    const rooms = makeRoomsForHotel(hotel);
    if (rooms.length === 0) continue;

    console.log(`   🔧 ${doc.id} (${hotel.name || hotel.title || "?"}) — adding ${rooms.length} rooms`);
    await db.collection("hotels").doc(doc.id).update({
      rooms,
      updatedAt: admin.firestore.Timestamp.now(),
    });
    fixed++;
  }

  console.log(`\n   ✅ Fixed ${fixed} hotels with rooms field.\n`);
  return fixed;
}

// ─── Phase 2: Upload placeholder markers to Storage ───────────────────

async function initStorageStructure() {
  console.log("🗄️  Phase 2: Initializing Firebase Storage directory structure...\n");

  const serviceTypes = ["tours", "hotels", "activities", "cars", "rentals"];
  let uploaded = 0;
  let errors = 0;

  for (const serviceType of serviceTypes) {
    let snapshot;
    try {
      snapshot = await db.collection(serviceType).get();
    } catch {
      console.log(`   ⚠️  Cannot read collection '${serviceType}' — skipping`);
      continue;
    }

    if (snapshot.empty) {
      console.log(`   ⚠️  Collection '${serviceType}' is empty — skipping`);
      continue;
    }

    for (const doc of snapshot.docs) {
      const serviceId = doc.id;
      const basePath = `${serviceType}/${serviceId}`;

      // Upload featured.webp placeholder
      const featuredPath = `${basePath}/featured.webp`;
      try {
        const file = bucket.file(featuredPath);
        const [exists] = await file.exists();
        if (!exists) {
          await file.save(TINY_WEBP_BUFFER, {
            contentType: "image/webp",
            metadata: { cacheControl: "public, max-age=31536000, immutable" },
          });
          uploaded++;
          console.log(`   ✅ ${featuredPath}`);
        } else {
          console.log(`   ⏭️  ${featuredPath} (already exists)`);
        }
      } catch (err) {
        errors++;
        console.error(`   ❌ ${featuredPath}: ${err.message}`);
      }

      // Upload gallery/01.webp placeholder
      const galleryPath = `${basePath}/gallery/01.webp`;
      try {
        const file = bucket.file(galleryPath);
        const [exists] = await file.exists();
        if (!exists) {
          await file.save(TINY_WEBP_BUFFER, {
            contentType: "image/webp",
            metadata: { cacheControl: "public, max-age=31536000, immutable" },
          });
          uploaded++;
          console.log(`   ✅ ${galleryPath}`);
        }
      } catch (err) {
        errors++;
        console.error(`   ❌ ${galleryPath}: ${err.message}`);
      }

      // ── Room image placeholders (hotels only) ─────────
      if (serviceType === "hotels") {
        const hotelData = doc.data();
        const rooms = hotelData.rooms || [];
        const roomsArr = Array.isArray(rooms) ? rooms : Object.values(rooms);

        for (const room of roomsArr) {
          if (!room.id) continue;
          const roomBase = `${basePath}/rooms/${room.id}`;

          // Room featured.webp
          const roomFeaturedPath = `${roomBase}/featured.webp`;
          try {
            const rf = bucket.file(roomFeaturedPath);
            const [rfExists] = await rf.exists();
            if (!rfExists) {
              await rf.save(TINY_WEBP_BUFFER, {
                contentType: "image/webp",
                metadata: { cacheControl: "public, max-age=31536000, immutable" },
              });
              uploaded++;
              console.log(`   ✅ ${roomFeaturedPath}`);
            }
          } catch (err) {
            errors++;
            console.error(`   ❌ ${roomFeaturedPath}: ${err.message}`);
          }

          // Room gallery/01.webp
          const roomGalleryPath = `${roomBase}/gallery/01.webp`;
          try {
            const rg = bucket.file(roomGalleryPath);
            const [rgExists] = await rg.exists();
            if (!rgExists) {
              await rg.save(TINY_WEBP_BUFFER, {
                contentType: "image/webp",
                metadata: { cacheControl: "public, max-age=31536000, immutable" },
              });
              uploaded++;
              console.log(`   ✅ ${roomGalleryPath}`);
            }
          } catch (err) {
            errors++;
            console.error(`   ❌ ${roomGalleryPath}: ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`\n   ✅ ${uploaded} files uploaded, ${errors} errors.\n`);
  return { uploaded, errors };
}

// ─── Phase 3: Re-seed price data for newly fixed hotels ───────────────

async function reseedPriceDataForFixedHotels() {
  console.log("💰 Phase 3: Re-seeding hotel_price_schedules for newly fixed hotels...\n");

  const hotelsSnap = await db.collection("hotels").get();
  const periods = [
    { name: "Thấp điểm", key: "p1_low", startDate: `${CURRENT_YEAR}-01-01`, endDate: `${CURRENT_YEAR}-04-30` },
    { name: "Cao điểm", key: "p2_high", startDate: `${CURRENT_YEAR}-05-01`, endDate: `${CURRENT_YEAR}-09-30` },
    { name: "Lễ Tết", key: "p3_peak", startDate: `${CURRENT_YEAR}-10-01`, endDate: `${CURRENT_YEAR}-12-31` },
  ];

  let created = 0;
  let skipped = 0;

  for (const doc of hotelsSnap.docs) {
    const hotel = doc.data();
    const hotelId = doc.id;
    const docId = `${hotelId}_base_${CURRENT_YEAR}`;

    // Skip if already has price schedule
    const existing = await db.collection("hotel_price_schedules").doc(docId).get();
    if (existing.exists) { skipped++; continue; }

    const rooms = hotel.rooms || [];
    if (rooms.length === 0) continue;

    const basePrice = hotel.pricing?.basePrice || hotel.minPrice || 1500000;

    // Generate priceData
    let priceData = {};
    for (const room of rooms) {
      if (!room.isActive) continue;
      const roomPriceBase = basePrice;

      const rateTypes = [
        { key: "standard", multiplier: 1.0 },
        { key: "breakfast", multiplier: 1.25 },
      ];

      for (const rt of rateTypes) {
        const key = `${room.id}_${rt.key}`;
        priceData[key] = {};
        for (const period of periods) {
          let sm = 1.0;
          if (period.key === "p2_high") sm = 1.35;
          if (period.key === "p3_peak") sm = 1.7;
          const sellPrice = Math.round(roomPriceBase * rt.multiplier * sm);
          priceData[key][`${period.key}_sup_local`] = {
            startDate: period.startDate, endDate: period.endDate,
            supplier: "Local Partner", costPrice: Math.round(sellPrice * 0.7), sellPrice,
          };
        }
      }
    }

    if (Object.keys(priceData).length === 0) continue;

    await db.collection("hotel_price_schedules").doc(docId).set({
      id: docId,
      info: {
        hotelId, ratePkg: "base", year: CURRENT_YEAR, status: "actived",
        supplierId: "sup_local",
        viewConfig: { periods: periods.map(p => p.name), packages: ["standard", "breakfast"], priceTypes: ["sellPrice", "costPrice"] },
      },
      priceData,
      searchTags: [hotel.name || hotel.title || "", hotel.address?.city || "", "base", String(CURRENT_YEAR)],
      updated_by: "init_script",
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
    });
    console.log(`   ✅ Created: ${docId} (${Object.keys(priceData).length} room-rate combos)`);
    created++;
  }

  console.log(`\n   ✅ ${created} new schedules created, ${skipped} already existed.\n`);
  return { created, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("🚀 9Trip — Storage Init + Hotel Room Fix + Price Reseed");
  console.log("=".repeat(70));
  console.log();

  const startTime = Date.now();

  // Phase 1
  const hotelsFixed = await fixHotelsWithoutRooms();

  // Phase 2
  const storageResult = await initStorageStructure();

  // Phase 3
  let reseedResult = { created: 0, skipped: 0 };
  if (hotelsFixed > 0) {
    reseedResult = await reseedPriceDataForFixedHotels();
  } else {
    console.log("💰 Phase 3: No new hotels to reseed — skipping.\n");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log(`   🏨 Hotels fixed (rooms added): ${hotelsFixed}`);
  console.log(`   🗄️  Storage files uploaded:     ${storageResult.uploaded}`);
  console.log(`   🗄️  Storage errors:             ${storageResult.errors}`);
  console.log(`   💰 Price schedules reseeded:    ${reseedResult.created}`);
  console.log(`   ⏱️  Time elapsed:               ${elapsed}s`);
  console.log();
}

main().catch(err => { console.error("❌ Fatal:", err); process.exit(1); });
