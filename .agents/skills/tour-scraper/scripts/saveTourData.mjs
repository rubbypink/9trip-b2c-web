import { initFirebaseApp, getFirestore, getBucket, setDoc, setSubcollection, serverTimestamp } from '../../../lib/firebase-helpers.mjs';
import { downloadFile, toWebP, uploadToStorage } from '../../../lib/image-helpers.mjs';
import { slugify, nowISO, timestampForFile, generateReport } from '../../../lib/scrape-helpers.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

// Initialize Firebase
initFirebaseApp();
const db = getFirestore();
const bucket = getBucket();

async function validateAndPrepare(data) {
  const errors = [];
  const warnings = [];

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Missing required field: title');
    return { tourData: null, errors, warnings };
  }

  const title = data.title.trim();
  const slug = slugify(title);
  if (!slug) {
    errors.push(`Could not generate slug from: "${title}"`);
    return { tourData: null, errors, warnings };
  }

  // Check if tour exists
  const existing = await db.collection('tours').doc(slug).get();
  if (existing.exists) {
    errors.push(`Tour already exists: tours/${slug}`);
    return { tourData: null, errors, warnings };
  }

  const tourData = {
    id: slug,
    title,
    slug,
    duration: data.duration || '',
    durationDays: data.durationDays || null,
    location: data.location || '',
    address: data.address || '',
    description: data.description || '',
    excerpt: data.excerpt || (data.description ? data.description.replace(/<[^>]*>/g, '').slice(0, 200) : ''),
    featuredImage: '',
    gallery: [],
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    included: Array.isArray(data.included) ? data.included : [],
    excluded: Array.isArray(data.excluded) ? data.excluded : [],
    itinerary: Array.isArray(data.itinerary) ? data.itinerary.map((day, idx) => ({
      day: day.day || idx + 1,
      title: day.title || `Ngày ${day.day || idx + 1}`,
      description: day.description || '',
      meals: day.meals || '',
      overnight: day.overnight || '',
      images: Array.isArray(day.images) ? day.images : [],
    })) : [],
    ratingAverage: data.ratingAverage || 0,
    ratingCount: data.ratingCount || 0,
    categories: Array.isArray(data.categories) ? data.categories : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    map: data.map || null,
    cancellationPolicy: data.cancellationPolicy || '',
    childrenPolicy: data.childrenPolicy || '',
    notes: Array.isArray(data.notes) ? data.notes : [],
    faq: Array.isArray(data.faq) ? data.faq : [],
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    pricing: {
      adultPrice: data.pricing?.adultPrice || null,
      childPrice: data.pricing?.childPrice || null,
      infantPrice: data.pricing?.infantPrice || null,
      currency: data.pricing?.currency || 'VND',
      minPeople: data.pricing?.minPeople || null,
      maxPeople: data.pricing?.maxPeople || null,
      discountPercent: data.pricing?.discountPercent || 0,
    },
    reviews: {},
    isFeatured: data.isFeatured || false,
    status: data.status || 'active',
    metaTitle: data.metaTitle || title,
    metaDescription: data.metaDescription || data.excerpt || '',
    _firecrawlCredits: data._firecrawlCredits || 0,
  };

  return { tourData, errors, warnings };
}

async function processImage(tourId, imageUrl, index) {
  const rawBuffer = await downloadFile(imageUrl);
  const webpBuffer = await toWebP(rawBuffer, { quality: 85, maxWidth: 1920 });
  const storagePath = index === null
    ? `tours/${tourId}/featured.webp`
    : `tours/${tourId}/gallery/${String(index + 1).padStart(2, '0')}.webp`;
  return uploadToStorage(bucket, storagePath, webpBuffer);
}

async function processImages(tourId, data) {
  const errors = [];
  const warnings = [];
  const gallerySrcs = Array.isArray(data.gallery) ? data.gallery : [];
  const effectiveFeatured = data.featuredImage || gallerySrcs[0] || '';

  let featuredUrl = null;
  if (effectiveFeatured) {
    try {
      featuredUrl = await processImage(tourId, effectiveFeatured, null);
      console.log(`   Featured: ${featuredUrl}`);
    } catch (err) {
      errors.push(`Featured image failed: ${err.message}`);
    }
  } else {
    warnings.push('No featured image available');
  }

  const galleryUrls = [];
  if (gallerySrcs.length > 0) {
    const galleryResults = await Promise.allSettled(
      gallerySrcs.map((src, i) => processImage(tourId, src, i).then(url => ({ url, index: i })))
    );
    const ordered = [];
    for (const r of galleryResults) {
      if (r.status === 'fulfilled') {
        ordered[r.value.index] = r.value.url;
      } else {
        errors.push(`Gallery image failed: ${r.reason.message}`);
      }
    }
    galleryUrls.push(...ordered.filter(Boolean));
    console.log(`   Gallery: ${galleryUrls.length}/${gallerySrcs.length} uploaded`);
  }

  return { featuredUrl, galleryUrls, errors, warnings };
}

async function savePricingTiers(tourId, data) {
  const errors = [];
  const warnings = [];

  // Get pricing tiers from data (from _pricingTiers passed by tourScraper)
  let tiers = Array.isArray(data._pricingTiers) ? data._pricingTiers : [];

  // Fallback: create from basic pricing if no tiers
  if (tiers.length === 0 && data.pricing && data.pricing.adultPrice > 0) {
    const p = data.pricing;
    tiers = [{
      id: `tier_${tourId}_default`,
      name: 'Tour ghép',
      description: 'Tour ghép đoàn tiêu chuẩn',
      isFeatured: true,
      adultPrice: p.adultPrice || 0,
      childPrice: p.childPrice || 0,
      infantPrice: p.infantPrice || 0,
      currency: p.currency || 'VND',
      minPeople: p.minPeople || 1,
      maxPeople: p.maxPeople || 20,
      included: Array.isArray(data.included) ? data.included : [],
      isActive: true,
      sortOrder: 1,
    }];

    // Add private tier if maxPeople is small
    if (p.maxPeople && p.maxPeople <= 8) {
      tiers.push({
        id: `tier_${tourId}_private`,
        name: 'Tour riêng',
        description: 'Tour riêng cho nhóm nhỏ',
        isFeatured: false,
        adultPrice: Math.round((p.adultPrice || 0) * 1.3),
        childPrice: p.childPrice || 0,
        infantPrice: p.infantPrice || 0,
        currency: p.currency || 'VND',
        minPeople: 1,
        maxPeople: p.maxPeople,
        included: Array.isArray(data.included) ? data.included : [],
        isActive: true,
        sortOrder: 2,
      });
    }
  }

  let count = 0;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (!tier.name || !tier.adultPrice) {
      warnings.push(`Pricing tier #${i} missing name/price — skipped`);
      continue;
    }

    const tierId = tier.id || `tier_${slugify(tier.name)}`;
    await setSubcollection('tours', tourId, 'tourPricing', tierId, {
      ...tier,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    count++;
    console.log(`   Tier: tours/${tourId}/tourPricing/${tierId}`);
  }

  return { count, errors, warnings };
}

async function saveReviews(tourId, data) {
  const rawReviews = Array.isArray(data.reviews) ? data.reviews : [];
  const reviewsMap = {};

  for (let i = 0; i < Math.min(rawReviews.length, 10); i++) {
    const r = rawReviews[i];
    const rid = `review_${slugify(r.reviewerName || r.text || `r${i}`).slice(0, 20)}`;
    reviewsMap[rid] = {
      id: rid,
      reviewerName: r.reviewerName || '',
      reviewerAvatar: r.reviewerAvatar || '',
      rating: r.rating || 0,
      text: r.text || '',
      date: r.date || '',
      country: r.country || '',
      sortOrder: i + 1,
    };
  }

  return { reviewsMap, count: Object.keys(reviewsMap).length };
}

export async function saveTourData(inputData) {
  const startTime = Date.now();
  const startISO = nowISO();
  const allErrors = [];
  const allWarnings = [];

  console.log('Validate & check...');
  const { tourData, errors: ve, warnings: vw } = await validateAndPrepare(inputData);
  allErrors.push(...ve);
  allWarnings.push(...vw);

  if (!tourData) {
    return failResult(inputData, allErrors, allWarnings, startISO, startTime);
  }

  const tourId = tourData.id;
  console.log(`Tour: "${tourData.title}" (${tourId}), ${tourData.itinerary.length} itinerary days`);

  console.log('Sanitize contact info & company names...');
  const sourceUrl = inputData._sourceUrl || '';
  const sourceDomain = (() => {
    try { return new URL(sourceUrl).hostname.replace(/^www\./, '').split('.')[0]; } catch { return ''; }
  })();
  try {
    const sanitized = await sanitizeScrapedData(inputData, { type: 'tour', knownNames: [sourceDomain].filter(Boolean) });
    Object.assign(inputData, sanitized.data);
    if (sanitized.changes.length > 0) console.log(`   ${sanitized.changes.length} items sanitized`);
  } catch (err) {
    console.log(`   Sanitize warning: ${err.message}`);
  }

  console.log('Process images (download → WebP → upload)...');
  const { featuredUrl, galleryUrls, errors: ie, warnings: iw } = await processImages(tourId, inputData);
  allErrors.push(...ie);
  allWarnings.push(...iw);

  console.log('Process reviews...');
  const { reviewsMap, count: reviewCount } = await saveReviews(tourId, inputData);
  tourData.reviews = reviewsMap;
  tourData.featuredImage = featuredUrl || '';
  tourData.gallery = galleryUrls;

  console.log('Save to Firestore...');
  await setDoc('tours', tourId, tourData);
  console.log(`   Document: tours/${tourId}`);

  console.log('Save pricing tiers...');
  const { count: tierCount, errors: te, warnings: tw } = await savePricingTiers(tourId, inputData);
  allErrors.push(...te);
  allWarnings.push(...tw);

  const firecrawlCredits = inputData._firecrawlCredits || 0;

  console.log('Generate report...');
  const endISO = nowISO();
  const result = {
    success: allErrors.length === 0,
    tourTitle: tourData.title,
    tourId,
    tourSlug: tourId,
    pricingTierCount: tierCount,
    itineraryCount: tourData.itinerary.length,
    reviewCount,
    firecrawlCredits,
    featuredImageUrl: featuredUrl,
    galleryCount: galleryUrls.length,
    errors: allErrors,
    warnings: allWarnings,
    timing: { start: startISO, end: endISO, durationMs: Date.now() - startTime },
  };

  await generateReport(result, 'tour');
  return result;
}

function failResult(inputData, errors, warnings, startISO, startTime) {
  return {
    success: false,
    tourTitle: inputData.title || 'N/A',
    tourId: null,
    tourSlug: null,
    pricingTierCount: 0,
    itineraryCount: 0,
    reviewCount: 0,
    firecrawlCredits: inputData._firecrawlCredits || 0,
    featuredImageUrl: null,
    galleryCount: 0,
    errors,
    warnings,
    timing: { start: startISO, end: nowISO(), durationMs: Date.now() - startTime },
  };
}

async function main() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const m = arg.match(/^--(\w+)=(.+)$/);
    if (m) args[m[1]] = m[2];
  });

  const inputFile = args.input || args.file;
  if (!inputFile) {
    console.error('Usage: node saveTourData.mjs --input=path/to/data.json');
    process.exit(1);
  }
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const inputData = JSON.parse(raw);
  const result = await saveTourData(inputData);

  console.log(result.success ? 'SUCCESS' : 'FAILED');
  if (!result.success) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
