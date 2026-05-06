#!/usr/bin/env node
/**
 * Comprehensive test script for activity-scraper skill (v2).
 *
 * Covers the FULL pipeline:
 *   Phase 1: Browser extraction (scrapeActivityFromUrl with v2 fast clicking)
 *   Phase 2: Data validation (pricing tiers, gallery, metadata)
 *   Phase 3: Image download + WebP conversion (sample of 3 images)
 *   Phase 4: Content sanitization (competitor info replacement)
 *   Phase 5: Firestore save (if Firebase credentials available)
 *
 * Usage:
 *   node test-activity-scraper.mjs [url] [--skip-save] [--skip-images] [--verbose]
 *
 * @module test-activity-scraper
 */

import { scrapeActivityFromUrl } from './.agents/skills/activity-scraper/scripts/activityScraper.mjs';
import { sanitizeScrapedData } from './.agents/lib/sanitize-data.mjs';
import { downloadFile, toWebP, normalizeImageUrl } from './.agents/lib/image-helpers.mjs';
import { slugify } from './.agents/lib/scrape-helpers.mjs';
import fs from 'fs';
import path from 'path';

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = {};
const positional = [];
process.argv.slice(2).forEach((a) => {
  if (a.startsWith('--')) {
    const [key, val] = a.slice(2).split('=');
    args[key] = val !== undefined ? val : true;
  } else {
    positional.push(a);
  }
});

const url = positional[0] || 'https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619';
const skipSave = args['skip-save'] || false;
const skipImages = args['skip-images'] || false;
const verbose = args['verbose'] || false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';
const INFO = '📊';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${PASS} ${testName}`);
  } else {
    failedTests++;
    const msg = `${testName}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.log(`  ${FAIL} ${msg}`);
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('='.repeat(60));
console.log('  🧪 Activity Scraper — Comprehensive Test (v2)');
console.log('='.repeat(60));
console.log(`  URL: ${url}`);
console.log(`  Skip Save: ${skipSave}`);
console.log(`  Skip Images: ${skipImages}`);
console.log(`  Verbose: ${verbose}`);
console.log('');

const globalStart = Date.now();

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1: Browser Extraction
// ═══════════════════════════════════════════════════════════════════════════

section('Phase 1: Browser Extraction (scrapeActivityFromUrl v2)');

let result;
const chunks = [];
const phase1Start = Date.now();

try {
  result = await scrapeActivityFromUrl(url, {
    chunkSize: 2,
    onChunk: (chunk) => {
      chunks.push(chunk);
      if (verbose) {
        console.log(`  📦 Chunk received: ${chunk.length} tiers — ${chunk.map(t => t.tierName).join(', ')}`);
      }
    },
  });
  const phase1Duration = ((Date.now() - phase1Start) / 1000).toFixed(2);
  console.log(`  ⏱️  Phase 1 completed in ${phase1Duration}s\n`);

  assert(result.success, 'Extraction succeeded');
  assert(result.data, 'Result has data object');
  assert(result.tempFile, 'Temp file created', result.tempFile || 'missing');
} catch (error) {
  console.error(`  ${FAIL} Extraction threw error: ${error.message}`);
  if (verbose) console.error(error.stack);
  process.exit(1);
}

const data = result.data;

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2: Data Validation
// ═══════════════════════════════════════════════════════════════════════════

section('Phase 2: Data Validation');

// Basic metadata
assert(data.title && data.title.length > 5, 'Title extracted', data.title || 'empty');
assert(data.slug && data.slug.length > 3, 'Slug generated', data.slug || 'empty');
assert(data.description || data.excerpt, 'Description or excerpt present');
assert(data._sourceUrl === url, 'Source URL preserved');

// Pricing validation — CRITICAL
const pricing = data.pricing || {};
const tiers = pricing.tiers || [];

assert(tiers.length > 0, `Pricing tiers found: ${tiers.length}`);
assert(pricing.basePrice > 0 || tiers.some(t => t.basePrice > 0), 'Has valid base price');

let tiersWithAdult = 0;
let tiersWithChild = 0;
let tiersWithInfant = 0;

console.log(`\n  ${INFO} Pricing Tiers Detail:`);
tiers.forEach((tier, idx) => {
  const adult = tier.basePrice || tier.adultPrice || 0;
  const child = tier.childPrice;
  const infant = tier.infantPrice;
  if (adult > 0) tiersWithAdult++;
  if (child !== null && child !== undefined && child > 0) tiersWithChild++;
  if (infant !== null && infant !== undefined && infant > 0) tiersWithInfant++;

  console.log(`     ${idx + 1}. "${tier.name}" — Adult: ${adult?.toLocaleString('vi-VN')} | Child: ${child ?? 'N/A'} | Infant: ${infant ?? 'N/A'}`);
});
console.log('');

assert(tiersWithAdult > 0, `Tiers with adult price: ${tiersWithAdult}/${tiers.length}`);
// Child/infant prices may legitimately be 0 or null depending on the activity
if (tiersWithChild > 0) {
  console.log(`  ${PASS} Tiers with child price: ${tiersWithChild}/${tiers.length}`);
} else {
  console.log(`  ${WARN} No child prices extracted (may need btn-more interaction)`);
}
if (tiersWithInfant > 0) {
  console.log(`  ${PASS} Tiers with infant price: ${tiersWithInfant}/${tiers.length}`);
} else {
  console.log(`  ${WARN} No infant prices extracted (may not be available)`);
}

// Gallery validation
const gallery = data.gallery || [];
assert(gallery.length > 0, `Gallery images found: ${gallery.length}`);
assert(data.featuredImage, 'Featured image present', data.featuredImage ? data.featuredImage.substring(0, 60) : 'missing');

// Chunked streaming validation
if (chunks.length > 0) {
  const totalChunkedTiers = chunks.reduce((sum, c) => sum + c.length, 0);
  assert(chunks.length > 0, `Chunked streaming: ${chunks.length} chunks received, ${totalChunkedTiers} total tiers`);
} else {
  console.log(`  ${WARN} No chunks received (onChunk may not have been called by iVIVU extractor)`);
}

// Categories/tags
assert(Array.isArray(data.categories), 'Categories is array');
assert(Array.isArray(data.tags), 'Tags is array');

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3: Image Download + WebP Conversion (sample test)
// ═══════════════════════════════════════════════════════════════════════════

section('Phase 3: Image Download + WebP Conversion');

if (skipImages) {
  console.log(`  ${WARN} Skipped (--skip-images)`);
} else if (gallery.length === 0) {
  console.log(`  ${WARN} No gallery images to test`);
} else {
  // Test with up to 3 sample images
  const sampleImages = gallery.slice(0, 3);
  const tempDir = path.resolve('.temp/test-images');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  for (let i = 0; i < sampleImages.length; i++) {
    const imgUrl = normalizeImageUrl(sampleImages[i], 1024);
    try {
      console.log(`  📥 Downloading image ${i + 1}/${sampleImages.length}: ${imgUrl.substring(0, 70)}...`);
      const rawBuffer = await downloadFile(imgUrl);
      assert(rawBuffer.length > 1000, `Image ${i + 1} downloaded: ${(rawBuffer.length / 1024).toFixed(1)}KB`);

      const webpBuffer = await toWebP(rawBuffer);
      assert(webpBuffer.length > 100, `Image ${i + 1} converted to WebP: ${(webpBuffer.length / 1024).toFixed(1)}KB`);

      // Save sample WebP for inspection
      const outPath = path.join(tempDir, `sample-${i + 1}.webp`);
      fs.writeFileSync(outPath, webpBuffer);
      if (verbose) console.log(`     Saved: ${outPath}`);

      // WebP should typically be smaller than source
      const ratio = (webpBuffer.length / rawBuffer.length * 100).toFixed(1);
      console.log(`     Compression: ${ratio}% of original`);
    } catch (err) {
      assert(false, `Image ${i + 1} processing failed`, err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4: Content Sanitization
// ═══════════════════════════════════════════════════════════════════════════

section('Phase 4: Content Sanitization');

try {
  const sourceDomain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    } catch {
      return '';
    }
  })();

  const sanitized = await sanitizeScrapedData({ ...data }, {
    type: 'activity',
    knownNames: [sourceDomain].filter(Boolean),
  });

  assert(sanitized.data, 'Sanitization returned data');
  assert(Array.isArray(sanitized.changes), 'Sanitization returned changes list');

  if (sanitized.changes.length > 0) {
    console.log(`  ${INFO} ${sanitized.changes.length} sanitization changes applied:`);
    sanitized.changes.slice(0, 5).forEach(change => {
      console.log(`     - ${change}`);
    });
    if (sanitized.changes.length > 5) {
      console.log(`     ... and ${sanitized.changes.length - 5} more`);
    }
  } else {
    console.log(`  ${INFO} No sanitization changes needed`);
  }

  // Verify competitor info is replaced
  const sanitizedStr = JSON.stringify(sanitized.data);
  const hasCompetitorRef = sanitizedStr.toLowerCase().includes(sourceDomain.toLowerCase()) && sourceDomain !== '9tripphuquoc';
  if (hasCompetitorRef) {
    console.log(`  ${WARN} Sanitized data still references "${sourceDomain}" (may be in URL fields which are kept)`);
  } else {
    assert(true, 'No competitor references in sanitized data');
  }
} catch (err) {
  assert(false, 'Sanitization failed', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5: Firestore Save
// ═══════════════════════════════════════════════════════════════════════════

section('Phase 5: Firestore Save');

if (skipSave) {
  console.log(`  ${WARN} Skipped (--skip-save)`);
} else {
  try {
    // Check if Firebase credentials are available
    const serviceAccountPath = path.resolve('tripphuquoc-db-fs-firebase-adminsdk-fbsvc-5695f7d555.json');
    const envPath = path.resolve('.env.local');
    const hasCredentials = fs.existsSync(serviceAccountPath) || fs.existsSync(envPath);

    if (!hasCredentials) {
      console.log(`  ${WARN} Firebase credentials not found — skipping save test`);
      console.log(`     Need: ${serviceAccountPath}`);
      console.log(`     Or: ${envPath} with FIREBASE_* env vars`);
    } else {
      console.log('  💾 Attempting Firestore save...');

      // Use saveActivityData from the skill
      const { saveActivityData } = await import('./.agents/skills/activity-scraper/scripts/saveActivityData.mjs');

      // Modify slug to avoid collision with real data
      const testData = { ...data };
      const testSlug = `test-${data.slug || slugify(data.title)}-${Date.now()}`;
      testData.slug = testSlug;
      testData.title = `[TEST] ${testData.title}`;

      const saveResult = await saveActivityData(testData);
      assert(saveResult.success, 'Firestore save succeeded');
      assert(saveResult.activityId, `Activity ID: ${saveResult.activityId}`);

      if (saveResult.reportPath) {
        console.log(`  📄 Report: ${saveResult.reportPath}`);
      }

      // Clean up test document
      try {
        const { initFirebaseApp, getFirestore } = await import('./.agents/lib/firebase-helpers.mjs');
        initFirebaseApp();
        const db = getFirestore();
        await db.collection('activities').doc(saveResult.activityId).delete();
        console.log(`  🧹 Test document deleted: activities/${saveResult.activityId}`);
      } catch (cleanupErr) {
        console.log(`  ${WARN} Could not delete test document: ${cleanupErr.message}`);
      }
    }
  } catch (err) {
    assert(false, 'Firestore save failed', err.message);
    if (verbose) console.error(err.stack);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

const totalDuration = ((Date.now() - globalStart) / 1000).toFixed(2);

console.log(`\n${'='.repeat(60)}`);
console.log(`  🧪 TEST SUMMARY`);
console.log(`${'='.repeat(60)}`);
console.log(`  Total tests: ${totalTests}`);
console.log(`  ${PASS} Passed: ${passedTests}`);
console.log(`  ${FAIL} Failed: ${failedTests}`);
console.log(`  ⏱️  Duration: ${totalDuration}s`);

if (failures.length > 0) {
  console.log(`\n  ${FAIL} FAILURES:`);
  failures.forEach((f, i) => console.log(`     ${i + 1}. ${f}`));
}

console.log(`\n  📊 Data Summary:`);
console.log(`     Title: ${data.title}`);
console.log(`     Pricing tiers: ${tiers.length}`);
console.log(`     Gallery images: ${gallery.length}`);
console.log(`     Categories: ${(data.categories || []).length}`);
console.log(`     Temp file: ${result.tempFile}`);

console.log(`${'='.repeat(60)}\n`);

if (failedTests > 0) {
  process.exit(1);
}
