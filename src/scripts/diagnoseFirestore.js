/**
 * Firestore Diagnostic Script — Kiểm tra dữ liệu hiện tại trong Firestore.
 *
 * Mục đích:
 * 1. Kiểm tra collections có tồn tại không, có documents không
 * 2. Kiểm tra slug fields có trong documents không
 * 3. Lấy mẫu documents để xem cấu trúc field
 * 4. Báo cáo lỗi nếu có (thiếu slug, thiếu index, etc.)
 * 5. Kiểm tra subcollections (roomPricing, tourPricing, roomTypes)
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

const COLLECTIONS = ["tours", "hotels", "rooms", "activities", "cars", "rentals", "locations", "settings", "coupons", "reviews", "users", "bookings", "inventory_holds", "notifications"];

const MAIN_COLLECTIONS = ["tours", "hotels", "activities", "cars", "rentals"];

const SUBCOLLECTION_PATHS = [
  { parent: "tours", sub: "tourPricing" },
  { parent: "hotels", sub: "roomTypes" },
  { parent: "hotels", sub: "rooms" },
  { parent: "hotels", sub: "inventory" },
  { parent: "activities", sub: "activityPricing" },
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

      // Check featuredImage
      const hasFeaturedImage = !!data.featuredImage;
      const featuredImagePreview = data.featuredImage
        ? data.featuredImage.substring(0, 80) + (data.featuredImage.length > 80 ? "..." : "")
        : null;

      result.sampleDocs.push({
        id: doc.id,
        name: data.name || data.title || "(no name/title)",
        slug: data.slug || "❌ MISSING",
        hasFeaturedImage,
        featuredImage: featuredImagePreview,
        pricing: pricingInfo,
        galleryCount: data.gallery?.length || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || "unknown",
      });
    }

    result.hasSlug = result.slugCount > 0;
  } catch (error) {
    result.errors.push(error.message);
    console.error(`  ❌ Error checking ${colName}:`, error.message);
  }

  return result;
}

async function checkSubcollection(parentCol, subName) {
  const result = {
    path: `${parentCol}/{docId}/${subName}`,
    exists: false,
    docCount: 0,
    errors: [],
  };

  try {
    // Try to find a parent document first
    const parentSnap = await db.collection(parentCol).limit(1).get();
    if (parentSnap.empty) {
      result.note = `Parent collection '${parentCol}' is empty, can't check subcollection`;
      return result;
    }

    const parentId = parentSnap.docs[0].id;
    const subRef = db.collection(parentCol).doc(parentId).collection(subName);
    const subSnap = await subRef.limit(5).get();

    if (!subSnap.empty) {
      result.exists = true;
      result.docCount = subSnap.size;
      result.parentId = parentId;
      result.sampleFields = subSnap.docs[0] ? Object.keys(subSnap.docs[0].data()) : [];
    } else {
      result.note = `Subcollection tồn tại nhưng empty (parent: ${parentId})`;
    }
  } catch (error) {
    result.errors.push(error.message);
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
    subcollections: {},
    issues: [],
    summary: {
      totalCollections: 0,
      emptyCollections: 0,
      collectionsWithSlug: 0,
      collectionsWithoutSlug: 0,
      subcollectionsExist: 0,
      errors: 0,
    },
  };

  // Check main collections
  for (const col of COLLECTIONS) {
    console.log(`📂 Checking ${col}...`);
    const result = await checkCollection(col);
    report.collections[col] = result;
  }

  console.log();

  // Check subcollections
  console.log("📂 Checking subcollections...");
  for (const sc of SUBCOLLECTION_PATHS) {
    console.log(`   ${sc.parent}/{id}/${sc.sub}...`);
    const result = await checkSubcollection(sc.parent, sc.sub);
    report.subcollections[`${sc.parent}/${sc.sub}`] = result;
  }

  // Analyze
  for (const [col, result] of Object.entries(report.collections)) {
    if (!result.exists) {
      report.summary.emptyCollections++;
      report.issues.push(`❌ ${col}: Collection không có documents nào`);
    } else if (!result.hasSlug) {
      report.summary.collectionsWithoutSlug++;
      report.issues.push(`⚠️ ${col}: Có ${result.documentCount} documents nhưng KHÔNG có slug field`);
    } else {
      report.summary.collectionsWithSlug++;
    }

    if (result.errors.length > 0) {
      report.summary.errors++;
      result.errors.forEach(e =>
        report.issues.push(`🔴 ${col}: Lỗi — ${e}`)
      );
    }
  }

  for (const [path, result] of Object.entries(report.subcollections)) {
    if (result.exists) {
      report.summary.subcollectionsExist++;
      report.issues.push(`✅ ${path}: Có ${result.docCount} documents`);
    } else {
      report.issues.push(`ℹ️ ${path}: Không có dữ liệu (chưa tạo)`);
    }
  }

  report.summary.totalCollections = COLLECTIONS.length;

  // Print report
  console.log();
  console.log("=".repeat(70));
  console.log("📊 DIAGNOSTIC REPORT");
  console.log("=".repeat(70));
  console.log();
  console.log(`Collections checked:    ${report.summary.totalCollections}`);
  console.log(`Empty collections:      ${report.summary.emptyCollections}`);
  console.log(`With slug:              ${report.summary.collectionsWithSlug}`);
  console.log(`Without slug:           ${report.summary.collectionsWithoutSlug}`);
  console.log(`Subcollections found:   ${report.summary.subcollectionsExist}`);
  console.log(`Errors:                 ${report.summary.errors}`);
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
        console.log(`       featuredImage: ${d.hasFeaturedImage ? "✅" : "❌"} ${d.featuredImage || ""}`);
        console.log(`       gallery: ${d.galleryCount} images`);
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
