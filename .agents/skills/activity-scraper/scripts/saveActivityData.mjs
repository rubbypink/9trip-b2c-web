/**
 * Save Activity Data — Simplified ESM module for saving activity data to Firebase.
 *
 * Handles: validation, image processing, Firestore document creation.
 *
 * Usage:
 *   import { saveActivityData } from './saveActivityData.mjs';
 *   await saveActivityData({ title: '...', ... });
 *
 * CLI:
 *   node .agents/skills/activity-scraper/scripts/saveActivityData.mjs --input=path/to/data.json
 *
 * @module saveActivityData
 */

import { initFirebaseApp, getFirestore, getBucket, docExists, setDoc, serverTimestamp } from '../../../lib/firebase-helpers.mjs';
import { downloadFile, toWebP, uploadToStorage } from '../../../lib/image-helpers.mjs';
import { slugify, nowISO, timestampForFile, generateReport } from '../../../lib/scrape-helpers.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

// ─────────────────────────────────────────────────────────────────────────────
// Validation & Duplicate Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate input data and check for duplicate slug.
 * Activity document ID = slug.
 *
 * @param {object} data - Raw activity data
 * @returns {Promise<{activityData: object|null, activityId: string|null, errors: string[], warnings: string[]}>}
 */
async function validateAndCheck(data) {
  const errors = [];
  const warnings = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push("Missing required field: 'title'");
    return { activityData: null, activityId: null, errors, warnings };
  }

  const title = data.title.trim();
  const slug = data.slug || slugify(title);

  if (!slug) {
    errors.push(`Could not generate slug from title: "${title}"`);
    return { activityData: null, activityId: null, errors, warnings };
  }

  const activityId = slug;

  // Check for existing document
  const { exists, data: existingData } = await docExists('activities', activityId);
  if (exists) {
    errors.push(
      `Activity with slug "${slug}" already exists: activities/${activityId} ("${existingData?.title || '?'}" )`
    );
    return { activityData: null, activityId: null, errors, warnings };
  }

  // Build ratings
  let ratingAverage = data.ratingAverage || 0;
  let ratingCount = data.ratingCount || 0;
  if (data.rating) {
    ratingAverage = data.rating.average || ratingAverage;
    ratingCount = data.rating.count || ratingCount;
  }

  // Build activity document (pricing is EMBEDDED, not subcollection)
  const activityData = {
    id: activityId,
    title,
    slug,
    duration: data.duration || '',
    durationDetail: data.durationDetail || '',
    location: data.location || '',
    locationDetail: data.locationDetail || '',
    description: data.description || '',
    excerpt: data.excerpt || (data.description ? data.description.replace(/<[^>]*>/g, '').slice(0, 200) : ''),
    featuredImage: '',
    gallery: [],
    openingHours: data.openingHours || '',
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    included: Array.isArray(data.included) ? data.included : [],
    excluded: Array.isArray(data.excluded) ? data.excluded : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    capacity: data.capacity || null,
    recommendation: data.recommendation || '',
    childrenPolicy: data.childrenPolicy || '',
    cancellationPolicy: data.cancellationPolicy || '',
    notes: Array.isArray(data.notes) ? data.notes : [],
    purchaseGuide: Array.isArray(data.purchaseGuide) ? data.purchaseGuide : [],
    faq: Array.isArray(data.faq) ? data.faq : [],
    ratingAverage,
    ratingCount,
    map: data.map || null,
    isFeatured: data.isFeatured || false,
    status: data.status || 'active',
    tags: Array.isArray(data.tags) ? data.tags : [],
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    // Pricing with embedded tiers (not subcollection like tours)
    pricing: data.pricing && typeof data.pricing === 'object' && Object.keys(data.pricing).length > 0
      ? data.pricing
      : {
          basePrice: 0,
          adultPrice: 0,
          childPrice: null,
          currency: 'VND',
          tiers: [
            { id: 'price_default', name: 'Vé tiêu chuẩn', description: '', adultPrice: 0, childPrice: null, currency: 'VND', discountPercent: 0, included: [] }
          ],
        },
    reviews: {},
    metaTitle: data.metaTitle || title,
    metaDescription: data.metaDescription || data.excerpt || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    _sourceUrl: data._sourceUrl || '',
    _firecrawlCredits: data._firecrawlCredits || 0,
  };

  return { activityData, activityId, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process images: download → WebP → upload to Storage.
 * Featured image fallback: if no featuredImage, use gallery[0].
 *
 * @param {string} activityId - Activity ID (slug)
 * @param {{featuredImage: string, gallery: string[]}} images - Image URLs
 * @returns {Promise<{featuredUrl: string|null, galleryUrls: string[], errors: string[], warnings: string[]}>}
 */
async function processImages(activityId, images) {
  const errors = [];
  const warnings = [];
  let featuredUrl = null;
  const galleryUrls = [];

  const bucket = getBucket();
  const featuredSrc = images.featuredImage || '';
  const gallerySrcs = Array.isArray(images.gallery) ? images.gallery : [];

  // Fallback to first gallery image if no featured
  let effectiveFeatured = featuredSrc;
  if (!effectiveFeatured && gallerySrcs.length > 0) {
    effectiveFeatured = gallerySrcs[0];
    warnings.push('No featuredImage provided — using first gallery image as featured');
  }

  // Process featured image
  if (effectiveFeatured) {
    try {
      console.log(`   📥 Downloading featured image: ${effectiveFeatured.slice(0, 80)}...`);
      const rawBuffer = await downloadFile(effectiveFeatured);
      const webpBuffer = await toWebP(rawBuffer);
      const storagePath = `activities/${activityId}/featured.webp`;
      featuredUrl = await uploadToStorage(bucket, storagePath, webpBuffer, 'image/webp');
      console.log(`   ✅ Featured image uploaded: ${storagePath}`);
    } catch (err) {
      errors.push(`Featured image failed: ${err.message}`);
    }
  } else {
    warnings.push('No featured image available');
  }

  // Process gallery images
  for (let i = 0; i < gallerySrcs.length; i++) {
    const src = gallerySrcs[i];

    // Skip if this is the same as featured image and featured uploaded successfully
    if (src === effectiveFeatured && featuredUrl) {
      galleryUrls.push(featuredUrl);
      continue;
    }

    try {
      console.log(`   📥 Downloading gallery image ${i + 1}/${gallerySrcs.length}: ${src.slice(0, 80)}...`);
      const rawBuffer = await downloadFile(src);
      const webpBuffer = await toWebP(rawBuffer);
      const padIdx = String(i + 1).padStart(2, '0');
      const storagePath = `activities/${activityId}/gallery/${padIdx}.webp`;
      const url = await uploadToStorage(bucket, storagePath, webpBuffer, 'image/webp');
      galleryUrls.push(url);
      console.log(`   ✅ Gallery image ${padIdx} uploaded`);
    } catch (err) {
      errors.push(`Gallery image ${i + 1} failed: ${err.message}`);
      warnings.push(`Skipped gallery image ${i + 1} due to error`);
    }
  }

  return { featuredUrl, galleryUrls, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process reviews (max 10) into embedded Map format.
 *
 * @param {Array} rawReviews - Raw reviews array
 * @returns {object} Reviews map with review_xxx keys
 */
function processReviews(rawReviews) {
  const reviewsMap = {};
  const reviews = Array.isArray(rawReviews) ? rawReviews : [];

  for (let i = 0; i < Math.min(reviews.length, 10); i++) {
    const r = reviews[i];
    const reviewerName = r.reviewerName || 'anonymous';
    const dateSlug = (r.date || '').replace(/[^a-z0-9]/gi, '');
    const reviewId = `review_${slugify(reviewerName)}${dateSlug ? '-' + dateSlug : ''}-${i}`;

    reviewsMap[reviewId] = {
      id: reviewId,
      reviewerName: reviewerName,
      reviewerAvatar: r.reviewerAvatar || '',
      rating: r.rating || 0,
      text: r.text || '',
      date: r.date || '',
      country: r.country || '',
      sortOrder: i + 1,
    };
  }

  return reviewsMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Save Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save activity data to Firebase Firestore and Storage.
 *
 * @param {object} inputData - Activity data to save
 * @returns {Promise<{success: boolean, activityId: string, activityTitle: string, reportPath: string}>}
 */
export async function saveActivityData(inputData) {
  const startTime = Date.now();
  const startISO = nowISO();

  console.log('='.repeat(60));
  console.log('  🎭 Save Activity Data — Firebase Handler');
  console.log('='.repeat(60));

  // Initialize Firebase
  initFirebaseApp();

  // Step 1: Sanitize
  console.log('\n🧹 Step 1/5: Sanitizing data...');
  let data = { ...inputData };
  try {
    const sourceUrl = data._sourceUrl || '';
    const sourceDomain = (() => {
      try {
        return new URL(sourceUrl).hostname.replace(/^www\./, '').split('.')[0];
      } catch {
        return '';
      }
    })();
    const { data: sanitizedData, changes } = await sanitizeScrapedData(data, {
      type: 'activity',
      knownNames: [sourceDomain].filter(Boolean),
    });
    data = sanitizedData;
    if (changes.length > 0) {
      console.log(`   ✅ ${changes.length} items sanitized`);
    }
  } catch (err) {
    console.log(`   ⚠️ Sanitize warning: ${err.message}`);
  }

  // Step 2: Validate & check for duplicates
  console.log('\n📋 Step 2/5: Validating data & checking duplicates...');
  const { activityData, activityId, errors: validationErrors, warnings: validationWarnings } = await validateAndCheck(data);

  if (!activityData) {
    console.error('❌ Validation failed:');
    validationErrors.forEach((e) => console.error(`   - ${e}`));
    throw new Error(validationErrors.join(', '));
  }

  const activityTitle = activityData.title;
  console.log(`   ✅ Title: "${activityTitle}"`);
  console.log(`   ✅ ID/Slug: "${activityId}"`);
  console.log(`   ✅ Duration: "${activityData.duration}"`);
  console.log(`   ✅ Location: "${activityData.location}"`);

  // Step 3: Process images
  console.log('\n🖼️  Step 3/5: Processing images...');
  const imgInput = {
    featuredImage: data.featuredImage || '',
    gallery: data.gallery || [],
  };
  const { featuredUrl, galleryUrls, errors: imgErrors, warnings: imgWarnings } = await processImages(activityId, imgInput);
  console.log(`   ✅ Featured: ${featuredUrl ? 'Uploaded' : 'None'}`);
  console.log(`   ✅ Gallery: ${galleryUrls.length} images`);

  // Step 4: Process reviews and save document
  console.log('\n💾 Step 4/5: Saving to Firestore...');

  // Process reviews (max 10, embedded Map)
  const reviewsMap = processReviews(data.reviews);
  const reviewCount = Object.keys(reviewsMap).length;
  if (reviewCount > 0) {
    console.log(`   ✅ Reviews: ${reviewCount} processed (max 10)`);
  }

  // Prepare final document
  const finalData = {
    ...activityData,
    featuredImage: featuredUrl || '',
    gallery: galleryUrls,
    reviews: reviewsMap,
  };

  // Save to Firestore
  await setDoc('activities', activityId, finalData);
  console.log(`   ✅ Activity document created: activities/${activityId}`);

  // Step 5: Generate report
  console.log('\n📄 Step 5/5: Generating report...');
  const endTime = Date.now();
  const endISO = nowISO();

  const tierCount = data.pricing?.tiers?.length || 0;
  const allErrors = [...validationErrors, ...imgErrors];
  const allWarnings = [...validationWarnings, ...imgWarnings];

  const result = {
    success: allErrors.length === 0,
    activityTitle,
    activityId,
    activitySlug: activityId,
    pricingTierCount: tierCount,
    reviewCount,
    firecrawlCredits: data._firecrawlCredits || 0,
    featuredImageUrl: featuredUrl,
    galleryCount: galleryUrls.length,
    errors: allErrors,
    warnings: allWarnings,
    timing: { start: startISO, end: endISO, durationMs: endTime - startTime },
  };

  const reportPath = await generateReport(result, 'activity');
  console.log(`   ✅ Report saved: ${reportPath}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log('  ✅ COMPLETE — All steps finished successfully');
  } else {
    console.log('  ⚠️  COMPLETE — Finished with errors');
  }
  console.log(`  🎭 Activity: activities/${activityId}`);
  console.log(`  🖼️  Gallery: ${galleryUrls.length} images`);
  console.log(`  💰 Pricing tiers: ${tierCount} (embedded)`);
  console.log(`  💬 Reviews: ${reviewCount}`);
  console.log(`  🔥 FireCrawl credits: ${result.firecrawlCredits}`);
  console.log(`  ⏱  Time: ${result.timing.durationMs}ms`);
  console.log('='.repeat(60));

  return {
    success: result.success,
    activityId,
    activityTitle,
    reportPath,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  });

  const INPUT_FILE = args.input;

  if (!INPUT_FILE) {
    console.error('❌ Usage: node saveActivityData.mjs --input=path/to/data.json');
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ File not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  // Read input file
  let inputData;
  try {
    const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
    inputData = JSON.parse(raw);
    console.log(`📖 Read ${raw.length} bytes from input file`);
  } catch (err) {
    console.error(`❌ Failed to read/parse input file: ${err.message}`);
    process.exit(1);
  }

  try {
    const result = await saveActivityData(inputData);
    if (!result.success) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
