/**
 * Firestore Diagnostic Script — Kiểm tra dữ liệu hiện tại trong Firestore.
 *
 * Mục đích:
 * 1. Kiểm tra tất cả collections có tồn tại không, có documents không
 * 2. Kiểm tra slug fields có trong documents không
 * 3. Lấy mẫu documents để xem cấu trúc field + phân loại ảnh
 * 4. Kiểm tra 3 collection bảng giá mới (hotel_price_schedules, service_price_schedules, tour_prices)
 * 5. Báo cáo TRUNG THỰC — ghi nhận mọi lỗi, không báo cáo gian dối
 *
 * Chạy: node src/scripts/diagnoseFirestore.js
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

/** All Firestore collections expected in the project. */
const COLLECTIONS = [
  // Core service collections (ERP sync — read only)
  "tours", "hotels", "rooms", "activities", "cars", "rentals", "locations",
  // Pricing collections (MỚI — cần seed data)
  "hotel_price_schedules", "service_price_schedules", "tour_prices",
  // System collections
  "settings", "coupons", "reviews", "users", "bookings", "inventory_holds", "notifications",
];

/** Core service collections to show detailed sample output for. */
const MAIN_COLLECTIONS = [
  "tours", "hotels", "activities", "cars", "rentals",
  "hotel_price_schedules", "service_price_schedules", "tour_prices",
];

/** Known image fields to scan per document. */
const IMAGE_FIELDS = [
  "featuredImage", "gallery", "images", "media", "logo",
  "avatar", "userAvatar", "photoURL", "coverImage",
];


async function checkCollection(colName) {
  const result = {
    collection: colName,
    exists: false,
    documentCount: 0,
    hasSlug: null,
    slugCount: 0,
    slugExamples: [],
    missingSlugExamples: [],
    fields: new Set(),
    sampleDocs: [],
    note: null,
    errors: [],
  };

  try {
    const colRef = db.collection(colName);
    const limit = 5;
    const snapshot = await colRef.limit(limit).get();

    if (snapshot.empty) {
      result.exists = false;
      result.documentCount = 0;
      result.note = "Collection tồn tại nhưng KHÔNG có documents nào";
      return result;
    }

    result.exists = true;

    // Count total docs (may be slow for large collections)
    try {
      const countSnap = await colRef.count().get();
      result.documentCount = countSnap.data().count;
    } catch {
      result.documentCount = "unknown (no count index)";
    }

    // Analyze sample docs
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fields = Object.keys(data).filter(k => !k.startsWith("_"));

      fields.forEach(f => result.fields.add(f));

      // Check slug
      if (data.slug) {
        result.slugCount++;
        if (result.slugExamples.length < 3) {
          result.slugExamples.push({ id: doc.id, slug: data.slug });
        }
      } else {
        if (result.missingSlugExamples.length < 3) {
          result.missingSlugExamples.push({ id: doc.id, name: data.name || data.title || "(no name)" });
        }
      }

      // Check pricing structure
      const pricingInfo = {};
      if (data.pricing) {
        pricingInfo.hasPricing = true;
        pricingInfo.currency = data.pricing.currency || "not set";
        pricingInfo.hasAdultPrice = !!data.pricing.adultPrice;
        pricingInfo.hasBasePrice = !!data.pricing.basePrice;
      }

      // Check featuredImage — classify URL type
      const hasFeaturedImage = !!data.featuredImage;
      let featuredImagePreview = null;
      let imageStatus = "none";
      if (data.featuredImage) {
        featuredImagePreview = data.featuredImage.substring(0, 80) + (data.featuredImage.length > 80 ? "..." : "");
        // Quick classify
        if (data.featuredImage.startsWith("gs://")) {
          imageStatus = "gs-path (needs resolve)";
        } else if (data.featuredImage.includes("picsum.photos")) {
          imageStatus = "⚠️ placeholder (picsum)";
        } else if (data.featuredImage.includes("rootytrip.com")) {
          imageStatus = "🔄 wordpress (needs migrate)";
        } else if (data.featuredImage.startsWith("http")) {
          imageStatus = "✅ external URL";
        } else if (data.featuredImage.startsWith("/")) {
          imageStatus = "relative path";
        } else {
          imageStatus = "❓ unknown format";
        }
      } else {
        imageStatus = "❌ MISSING";
      }

      // Count images across all known fields
      let totalImages = data.gallery?.length || 0;
      for (const f of IMAGE_FIELDS) {
        if (f === "gallery" || f === "featuredImage") continue;
        if (Array.isArray(data[f])) totalImages += data[f].length;
        else if (data[f]) totalImages += 1;
      }

      result.sampleDocs.push({
        id: doc.id,
        name: data.name || data.title || "(no name/title)",
        slug: data.slug || "❌ MISSING",
        hasFeaturedImage,
        featuredImage: featuredImagePreview,
        imageStatus,
        totalImages,
        pricing: pricingInfo,
        galleryCount: data.gallery?.length || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || "unknown",
      });
    }

    result.hasSlug = result.slugCount > 0;
  } catch (error) {
    const msg = error.message || String(error);
    result.errors.push(msg);

    // Categorize the error for better reporting
    if (msg.includes("PERMISSION_DENIED") || msg.includes("Missing or insufficient permissions")) {
      result.note = "🚫 Permission denied — collection may not exist or security rules block access";
      console.error(`  🔴 [PERMISSION] ${colName}: ${msg}`);
    } else if (msg.includes("NOT_FOUND") || msg.includes("does not exist")) {
      result.note = "❌ Collection does not exist in Firestore";
      console.error(`  🔴 [NOT_FOUND] ${colName}: ${msg}`);
    } else if (msg.includes("UNAVAILABLE") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
      result.note = "🌐 Network error — cannot reach Firestore";
      console.error(`  🔴 [NETWORK] ${colName}: ${msg}`);
    } else {
      result.note = `⚠️ Unknown error: ${msg}`;
      console.error(`  ❌ [ERROR] ${colName}: ${msg}`);
    }
  }

  return result;
}


async function main() {
  console.log("=".repeat(70));
  console.log("🔬 9Trip — Firestore Data Diagnostic");
  console.log("=".repeat(70));
  console.log();

  const report = {
    generatedAt: new Date().toISOString(),
    collections: {},
    issues: [],
    summary: {
      totalCollections: 0,
      emptyCollections: 0,
      collectionsWithSlug: 0,
      collectionsWithoutSlug: 0,
      newPriceCollectionsWithData: 0,
      newPriceCollectionsEmpty: 0,
      errors: 0,
    },
  };

  // ── Check all collections ─────────────────────────────────────────
  for (const col of COLLECTIONS) {
    console.log(`📂 Checking ${col}...`);
    const result = await checkCollection(col);
    report.collections[col] = result;
  }

  console.log();

  // ── Analyze results ──────────────────────────────────────────────

  const NEW_PRICE_COLLECTIONS = ["hotel_price_schedules", "service_price_schedules", "tour_prices"];

  for (const [col, result] of Object.entries(report.collections)) {
    const isNewPriceCol = NEW_PRICE_COLLECTIONS.includes(col);

    if (!result.exists) {
      report.summary.emptyCollections++;
      if (isNewPriceCol) {
        report.summary.newPriceCollectionsEmpty++;
        report.issues.push(`🆕 ${col}: Collection mới — CHƯA CÓ dữ liệu. Cần chạy: node src/scripts/seedPriceData.js`);
      } else {
        report.issues.push(`❌ ${col}: Collection không có documents nào`);
      }
    } else if (isNewPriceCol) {
      // New price collections don't need slug — check document count instead
      report.summary.newPriceCollectionsWithData++;
      report.issues.push(`✅ ${col}: Collection mới — đã có ${result.documentCount} documents`);
    } else if (!result.hasSlug) {
      report.summary.collectionsWithoutSlug++;
      report.issues.push(`⚠️ ${col}: Có ${result.documentCount} documents nhưng KHÔNG có slug field`);
    } else {
      report.summary.collectionsWithSlug++;
    }

    if (result.errors.length > 0) {
      report.summary.errors += result.errors.length;
      result.errors.forEach(e =>
        report.issues.push(`🔴 ${col}: Lỗi — ${e}`)
      );
    }
  }

  report.summary.totalCollections = COLLECTIONS.length;

  // Print report
  console.log();
  console.log("=".repeat(70));
  console.log("📊 DIAGNOSTIC REPORT");
  console.log("=".repeat(70));
  console.log();
  console.log(`Collections checked:         ${report.summary.totalCollections}`);
  console.log(`Empty collections:           ${report.summary.emptyCollections}`);
  console.log(`With slug field:             ${report.summary.collectionsWithSlug}`);
  console.log(`Without slug field:          ${report.summary.collectionsWithoutSlug}`);
  console.log(`New price collections ready: ${report.summary.newPriceCollectionsWithData}/3`);
  console.log(`New price collections empty: ${report.summary.newPriceCollectionsEmpty}/3`);
  console.log(`Errors encountered:          ${report.summary.errors}`);
  console.log();

  console.log("📋 Issue Summary:");
  for (const issue of report.issues) {
    console.log(`   ${issue}`);
  }

  console.log();

  // Print detailed per-collection
  console.log("📋 Collection Details:");
  console.log("-".repeat(70));

  for (const col of MAIN_COLLECTIONS) {
    const r = report.collections[col];
    if (!r) continue;

    console.log(`\n${col.toUpperCase()}:`);
    console.log(`   Documents: ${r.documentCount}`);
    console.log(`   Has slug: ${r.hasSlug ? "✅" : "❌"}`);
    if (r.slugExamples.length > 0) {
      console.log(`   Slug examples: ${r.slugExamples.map(s => `${s.slug} (${s.id})`).join(", ")}`);
    }
    if (r.missingSlugExamples.length > 0) {
      console.log(`   ❌ Missing slugs: ${r.missingSlugExamples.map(s => `${s.name} (${s.id})`).join(", ")}`);
    }

    if (r.sampleDocs.length > 0) {
      console.log(`   Fields: ${[...r.fields].join(", ")}`);
      console.log(`   Sample docs:`);
      r.sampleDocs.forEach(d => {
        console.log(`     - ${d.name}`);
        console.log(`       slug: ${d.slug}`);
        console.log(`       featuredImage: ${d.hasFeaturedImage ? "✅" : "❌"} ${d.imageStatus || ""} ${d.featuredImage || ""}`);
        console.log(`       gallery: ${d.galleryCount} images (total images: ${d.totalImages || 0})`);
        console.log(`       pricing: ${JSON.stringify(d.pricing)}`);
      });
    }
    console.log();
  }

  // Save report
  const outputPath = path.resolve(__dirname, "../..", "firestore-diagnostic.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`📄 Full report saved to: firestore-diagnostic.json`);
}

main().catch(console.error);
