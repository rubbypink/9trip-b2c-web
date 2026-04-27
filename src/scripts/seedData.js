/**
 * Seed Data Script — Import dữ liệu từ JSON files vào Firestore.
 *
 * Nguồn dữ liệu:
 *   - _raw_extract.json — Scrape từ WordPress (42 activities)
 *   - cloned_activities_output.json — Đã xử lý (12 activities)
 *
 * Chạy: node src/scripts/seedData.js
 *
 * ⚠️ Chạy DRY-RUN trước: node src/scripts/seedData.js --dry-run
 * ⚠️ Import thật: node src/scripts/seedData.js --import
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── Init Firebase Admin SDK ──────────────────────────────────────────

const serviceAccount = path.resolve(__dirname, "../..", "tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json");

if (!fs.existsSync(serviceAccount)) {
  console.error("❌ Không tìm thấy service account");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require(serviceAccount)) });
}
const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const DO_IMPORT = process.argv.includes("--import");

if (!DRY_RUN && !DO_IMPORT) {
  console.log("ℹ️  DRY-RUN mode (mặc định) — không ghi vào Firestore.");
  console.log("   Để import thật: node src/scripts/seedData.js --import");
  console.log();
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Tạo slug từ title
 * @param {string} title
 * @returns {string}
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Load JSON file
 * @param {string} filePath
 * @returns {Object|null}
 */
function loadJson(filePath) {
  const fullPath = path.resolve(__dirname, "../..", filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ File ${filePath} không tồn tại, bỏ qua.`);
    return null;
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

// ─── Import Functions ─────────────────────────────────────────────────

/**
 * Import activities từ cloned_activities_output.json (ưu tiên — đã format)
 * @returns {Promise<{imported: number, skipped: number}>}
 */
async function importClonedActivities() {
  const data = loadJson("cloned_activities_output.json");
  if (!data || !data.documents) return { imported: 0, skipped: 0 };

  const col = data.serviceType || "activities";
  const docs = data.documents;
  let imported = 0;
  let skipped = 0;

  console.log(`📂 Importing ${docs.length} ${col} from cloned_activities_output.json...`);

  for (const doc of docs) {
    const slug = doc.slug;
    if (!slug) {
      console.log(`  ⚠️ Skipping (no slug): ${doc.title}`);
      skipped++;
      continue;
    }

    // Check if already exists
    const existing = await db.collection(col).where("slug", "==", slug).limit(1).get();
    if (!existing.empty) {
      console.log(`  ⏭️ Skipping (exists): ${doc.title} (slug: ${slug})`);
      skipped++;
      continue;
    }

    // Prepare document
    const docData = {
      ...doc,
      createdAt: doc.createdAt ? new Date(doc.createdAt) : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : admin.firestore.FieldValue.serverTimestamp(),
      description: doc.description || doc.excerpt || "",
      excerpt: doc.excerpt || "",
      pricing: doc.pricing || { basePrice: 0, currency: "VND", discountPercent: 0 },
      gallery: doc.gallery || [],
      categories: doc.categories || [],
      isFeatured: doc.featured || false,
      rating: { average: doc.rating || 0, count: doc.reviewCount || 0 },
      status: doc.status || "active",
    };

    docData.featuredImage = doc.featuredImage || "";

    if (DRY_RUN) {
      console.log(`  📄 [DRY-RUN] Would import: ${docData.title} → ${col}/${slug}`);
      imported++;
      continue;
    }

    try {
      // Set with custom ID = slug for easy lookup
      await db.collection(col).doc(slug).set(docData);
      console.log(`  ✅ Imported: ${docData.title} → ${col}/${slug}`);
      imported++;
    } catch (error) {
      console.error(`  ❌ Failed: ${docData.title}: ${error.message}`);
      skipped++;
    }
  }

  return { imported, skipped };
}

/**
 * Import từ _raw_extract.json (dữ liệu thô từ WordPress)
 * @returns {Promise<{imported: number, skipped: number}>}
 */
async function importRawExtract() {
  const data = loadJson("_raw_extract.json");
  if (!data || !data.success || !data.data) return { imported: 0, skipped: 0 };

  let totalImported = 0;
  let totalSkipped = 0;

  for (const [serviceType, items] of Object.entries(data.data)) {
    if (!items || !Array.isArray(items)) continue;

    console.log(`\n📂 Importing ${items.length} ${serviceType} from _raw_extract.json...`);

    // Map service type to Firestore collection
    let collection;
    const typeLower = serviceType.toLowerCase();
    if (typeLower === "tours") collection = "tours";
    else if (typeLower === "hotels") collection = "hotels";
    else if (typeLower === "rooms") collection = "rooms";
    else if (typeLower === "activities") collection = "activities";
    else if (typeLower === "cars") collection = "cars";
    else if (typeLower === "rentals") collection = "rentals";
    else if (typeLower === "locations") collection = "locations";
    else continue;

    for (const item of items) {
      const slug = item.slug || generateSlug(item.title || item.name || "untitled");

      // Check if exists
      const existing = await db.collection(collection).where("slug", "==", slug).limit(1).get();
      if (!existing.empty) {
        console.log(`  ⏭️ Skipping (exists): ${item.title || item.name} (slug: ${slug})`);
        totalSkipped++;
        continue;
      }

      // Normalize data based on service type
      const docData = normalizeDoc(item, collection);

      if (DRY_RUN) {
        console.log(`  📄 [DRY-RUN] Would import: ${docData.name || docData.title} → ${collection}/${slug}`);
        totalImported++;
        continue;
      }

      try {
        await db.collection(collection).doc(slug).set(docData);
        console.log(`  ✅ Imported: ${docData.name || docData.title} → ${collection}/${slug}`);
        totalImported++;
      } catch (error) {
        console.error(`  ❌ Failed: ${docData.title || docData.name}: ${error.message}`);
        totalSkipped++;
      }
    }
  }

  return { imported: totalImported, skipped: totalSkipped };
}

/**
 * Chuẩn hóa document theo collection type
 * @param {Object} item
 * @param {string} collection
 * @returns {Object}
 */
function normalizeDoc(item, collection) {
  const base = {
    slug: item.slug || generateSlug(item.title || item.name || ""),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
 isFeatured: item.featured || false,
    status: item.status || "active",
  };

  if (collection === "activities") {
    return {
      ...base,
      title: item.title || item.name || "",
      excerpt: item.excerpt || "",
      description: item.description || item.excerpt || "",
      featuredImage: item.featuredImage || "",
      gallery: item.gallery || [],
      duration: item.duration || "",
      location: item.location || "",
      locationName: item.location || "",
      pricing: {
        basePrice: item.pricing?.basePrice || 0,
        adultPrice: item.pricing?.basePrice || 0,
        childPrice: item.pricing?.childPrice || 0,
        infantPrice: item.pricing?.infantPrice || 0,
        currency: item.pricing?.currency || "VND",
        discountPercent: item.pricing?.discountPercent || 0,
      },
      categories: item.categories || [],
      rating: { average: item.rating || 0, count: item.reviewCount || 0 },
    };
  }

  if (collection === "tours") {
    return {
      ...base,
      title: item.title || item.name || "",
      excerpt: item.excerpt || "",
      description: item.description || item.excerpt || "",
      featuredImage: item.featuredImage || "",
      gallery: item.gallery || [],
      duration: item.duration || "",
      locationName: item.location || "",
      locationId: item.locationId || "",
      pricing: {
        adultPrice: item.pricing?.adultPrice || item.pricing?.basePrice || 0,
        childPrice: item.pricing?.childPrice || 0,
        infantPrice: item.pricing?.infantPrice || 0,
        currency: item.pricing?.currency || "VND",
        discountPercent: item.pricing?.discountPercent || 0,
      },
      categories: item.categories || [],
      rating: { average: item.rating || 0, count: item.reviewCount || 0 },
    };
  }

  if (collection === "hotels") {
    return {
      ...base,
      name: item.name || item.title || "",
      excerpt: item.excerpt || item.description || "",
      description: item.description || "",
      featuredImage: item.featuredImage || "",
      gallery: item.gallery || [],
      starRating: item.starRating || 0,
      address: {
        street: item.address?.street || "",
        city: item.address?.city || item.location || "",
        cityId: item.address?.cityId || item.locationId || "",
        country: item.address?.country || "Việt Nam",
      },
      pricing: {
        basePrice: item.pricing?.basePrice || 0,
        currency: item.pricing?.currency || "VND",
      },
      amenities: item.amenities || [],
      highlights: item.highlights || [],
      rating: { average: item.rating || 0, count: item.reviewCount || 0 },
      policies: {
        checkIn: "14:00",
        checkOut: "12:00",
        cancellation: "",
        children: "",
        pets: "",
        taxes: "",
      },
    };
  }

  // Fallback: generic
  return {
    ...base,
    ...item,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log(DRY_RUN ? "🧪 9Trip — Seed Data (DRY-RUN)" : "🚀 9Trip — Seed Data Import");
  console.log("=".repeat(70));
  console.log();

  const results = {};

  // 1. Import cloned activities (ưu tiên — đã format chuẩn)
  console.log("📦 Phase 1: Cloned Activities");
  const clonedResult = await importClonedActivities();
  results.clonedActivities = clonedResult;

  // 2. Import raw extract
  console.log("\n📦 Phase 2: Raw Extract (WordPress data)");
  const rawResult = await importRawExtract();
  results.rawExtract = rawResult;

  // Summary
  const totalImported = (results.clonedActivities?.imported || 0) + (results.rawExtract?.imported || 0);
  const totalSkipped = (results.clonedActivities?.skipped || 0) + (results.rawExtract?.skipped || 0);

  console.log();
  console.log("=".repeat(70));
  if (DRY_RUN) {
    console.log("🧪 DRY-RUN COMPLETE");
    console.log(`   Would import: ${totalImported} documents`);
    console.log(`   Would skip:   ${totalSkipped} documents (already exist)`);
    console.log();
    console.log("   To import for real: node src/scripts/seedData.js --import");
  } else if (DO_IMPORT) {
    console.log("✅ IMPORT COMPLETE");
    console.log(`   Imported: ${totalImported} documents`);
    console.log(`   Skipped:  ${totalSkipped} documents`);
  }
}

main().catch(console.error);
