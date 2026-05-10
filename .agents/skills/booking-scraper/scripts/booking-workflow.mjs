#!/usr/bin/env node
/**
 * booking-workflow.mjs — Orchestrator script thực thi toàn bộ quy trình
 * booking-scraper cho một khách sạn.
 *
 * Workflow:
 *   Stage A: Tìm URL booking.com qua OpenRouter websearch
 *   Stage B: Scrape toàn bộ dữ liệu (hotel + rooms + images + reviews)
 *   Stage C: Lưu vào Firestore + Firebase Storage
 *
 * Usage:
 *   node booking-workflow.mjs --hotel="Vin HolidaysFiesta"
 *   node booking-workflow.mjs --url="https://www.booking.com/hotel/vn/..."  (skip Stage A)
 *
 * @module booking-workflow
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const TEMP_DIR = path.join(PROJECT_ROOT, '.temp');

// ─── CLI Args ──────────────────────────────────────────────────────────

/** @type {{hotel?: string, url?: string, skipSearch?: boolean, skipSave?: boolean, help?: boolean}} */
const args = {};
for (const arg of process.argv.slice(2)) {
  const m = arg.match(/^--(\w+)=(.+)$/);
  if (m) {
    args[m[1]] = m[2];
  } else if (arg === '--help' || arg === '-h') {
    args.help = true;
  } else if (arg === '--skip-search') {
    args.skipSearch = true;
  } else if (arg === '--skip-save') {
    args.skipSave = true;
  }
}

if (args.help) {
  console.log(`
booking-workflow.mjs — Booking.com Hotel Scraper Orchestrator

Usage:
  node booking-workflow.mjs --hotel="Hotel Name"
  node booking-workflow.mjs --url="https://www.booking.com/hotel/vn/..."
  node booking-workflow.mjs --hotel="Hotel Name" --skip-save

Options:
  --hotel=<name>     Tên khách sạn cần scrape (tự động tìm URL)
  --url=<url>        URL booking.com trực tiếp (bỏ qua giai đoạn tìm kiếm)
  --skip-search      Bỏ qua Stage A (chỉ chạy scrape + save)
  --skip-save        Bỏ qua Stage C (chỉ scrape, không lưu Firestore)
  --help, -h         Hiển thị hướng dẫn này
`);
  process.exit(0);
}

// ─── Logging ────────────────────────────────────────────────────────────

const LOG_PREFIX = '[9Trip-Workflow]';

/**
 * @param {'info'|'ok'|'warn'|'err'|'step'} level
 * @param {string} msg
 */
function log(level, msg) {
  const icons = { info: 'ℹ️ ', ok: '✅', warn: '⚠️ ', err: '❌', step: '🔹' };
  console.error(`${icons[level] || ''} ${LOG_PREFIX} ${msg}`);
}

// ─── Stage A: Search Booking.com ────────────────────────────────────────

/**
 * Find hotel URL on booking.com using OpenRouter websearch.
 * @param {string} hotelName
 * @returns {Promise<string>} Booking.com URL
 */
async function stageAFindUrl(hotelName) {
  log('step', `Stage A: Searching booking.com for "${hotelName}"...`);

  const { searchForUrl } = await import('../../../lib/websearch.mjs');

  const results = await searchForUrl(
    `site:booking.com hotel "${hotelName}"`,
    { maxResults: 5 },
  );

  if (!results || results.length === 0) {
    throw new Error(`Không tìm thấy kết quả tìm kiếm cho "${hotelName}"`);
  }

  // Ưu tiên URL có chứa /hotel/vn/ và tên hotel
  const bookingUrl = results.find((r) =>
    r.url && r.url.includes('booking.com/hotel/'),
  );

  if (!bookingUrl) {
    // Fallback: thử search trực tiếp trên booking.com
    log('warn', 'Không tìm thấy URL booking.com trực tiếp. Đang thử phương án dự phòng...');

    const fallbackResults = await searchForUrl(
      `booking.com ${hotelName} hotel`,
      { maxResults: 5 },
    );

    const fallbackUrl = fallbackResults.find((r) =>
      r.url && r.url.includes('booking.com/hotel/'),
    );

    if (!fallbackUrl) {
      throw new Error(
        `Không tìm thấy URL trên booking.com cho "${hotelName}". ` +
        `Vui lòng cung cấp URL trực tiếp với --url=`,
      );
    }

    log('ok', `Found (fallback): ${fallbackUrl.url}`);
    return fallbackUrl.url;
  }

  log('ok', `Found: ${bookingUrl.url} — "${bookingUrl.title}"`);
  return bookingUrl.url;
}

// ─── Stage B: Scrape Data ───────────────────────────────────────────────

/**
 * Scrape hotel data from booking.com URL.
 * @param {string} targetUrl - Booking.com hotel URL
 * @returns {Promise<{success: boolean, data?: Object, error?: string, slug?: string}>}
 */
async function stageBScrape(targetUrl) {
  log('step', 'Stage B: Scraping hotel data from booking.com...');

  const { scrapeHotelFromUrl } = await import('./getHotelImages.mjs');
  const { slugify } = await import('../../../lib/scrape-helpers.mjs');

  const result = await scrapeHotelFromUrl(targetUrl);

  if (!result.success) {
    throw new Error(`Scrape thất bại: ${result.error || 'Unknown error'}`);
  }

  if (!result.data || !result.data.name) {
    throw new Error('Dữ liệu scrape không hợp lệ: thiếu tên khách sạn');
  }

  const slug = slugify(result.data.name);
  const hotelName = result.data.name;

  log('ok', `Scraped: "${hotelName}" (slug: ${slug})`);

  if (result.data._warnings && result.data._warnings.length > 0) {
    log('warn', `${result.data._warnings.length} warnings:`);
    for (const w of result.data._warnings.slice(0, 5)) {
      log('warn', `  - ${w}`);
    }
    if (result.data._warnings.length > 5) {
      log('warn', `  ... và ${result.data._warnings.length - 5} warnings khác`);
    }
  }

  // Lưu JSON vào .temp/
  await fs.promises.mkdir(TEMP_DIR, { recursive: true });
  const tempFile = path.join(TEMP_DIR, `booking-hotel-${slug}.json`);
  await fs.promises.writeFile(tempFile, JSON.stringify(result.data, null, 2), 'utf-8');

  log('ok', `Saved to: ${tempFile}`);

  return { success: true, data: result.data, slug, tempFile };
}

// ─── Stage C: Save to Firebase ──────────────────────────────────────────

/**
 * Save scraped data to Firestore + Storage.
 * @param {string} tempFile - Path to temp JSON file
 * @param {string} slug - Hotel slug
 */
function stageCSave(tempFile, slug) {
  log('step', 'Stage C: Saving to Firebase (Firestore + Storage)...');

  const saveScript = path.join(__dirname, 'saveBookingData.mjs');

  if (!fs.existsSync(saveScript)) {
    throw new Error(`Không tìm thấy saveBookingData.mjs tại: ${saveScript}`);
  }

  if (!fs.existsSync(tempFile)) {
    throw new Error(`Không tìm thấy temp file: ${tempFile}`);
  }

  log('info', `Running: node ${saveScript} --input=${tempFile}`);

  try {
    const output = execSync(
      `node "${saveScript}" --input="${tempFile}"`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 300000, // 5 phút timeout cho upload ảnh
      },
    );

    // Parse output for success/error
    if (output.includes('Success!') || output.includes('✨')) {
      log('ok', `Saved to Firestore! Slug: ${slug}`);
      return true;
    }

    // Check stderr for errors
    if (output.includes('❌')) {
      const errLine = output.split('\n').find((l) => l.includes('❌'));
      throw new Error(errLine || 'Save failed (unknown error)');
    }

    log('ok', 'Stage C completed.');
    return true;
  } catch (err) {
    // execSync throws on non-zero exit
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';

    // Kiểm tra xem có phải lỗi slug trùng không
    if (stderr.includes('already exists') || stdout.includes('already exists')) {
      log('warn', `Hotel "${slug}" already exists in Firestore. Skipping.`);
      return false;
    }

    throw new Error(`Save failed: ${stderr || stdout || err.message}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const startTime = new Date().toISOString();
  log('info', `Booking Workflow started at ${startTime}`);
  console.error('');

  // ── Validate inputs ──────────────────────────────────────────────
  if (!args.hotel && !args.url) {
    console.error('\nUsage: node booking-workflow.mjs --hotel="Hotel Name"');
    console.error('   or: node booking-workflow.mjs --url="https://www.booking.com/hotel/vn/..."');
    console.error('   --help for more options\n');
    process.exit(1);
  }

  /** @type {string} */
  let targetUrl = args.url || '';
  let skippedSearch = args.skipSearch || !!args.url;
  let scrapedData = null;
  let slug = '';

  try {
    // ── Stage A: Find URL ───────────────────────────────────────────
    if (!targetUrl && !skippedSearch && args.hotel) {
      targetUrl = await stageAFindUrl(args.hotel);
    } else if (!targetUrl && skippedSearch && args.hotel) {
      throw new Error(
        'Không thể scrape nếu không có URL. Cung cấp --url= hoặc bỏ qua --skip-search.',
      );
    }

    if (!targetUrl) {
      throw new Error('Không có URL để scrape.');
    }

    console.error(`   Target: ${targetUrl}`);
    console.error('');

    // ── Stage B: Scrape ─────────────────────────────────────────────
    const scrapeResult = await stageBScrape(targetUrl);
    scrapedData = scrapeResult.data;
    slug = scrapeResult.slug;

    console.error('');

    // ── Stage C: Save to Firebase ───────────────────────────────────
    if (!args.skipSave) {
      await stageCSave(scrapeResult.tempFile, slug);
    } else {
      log('warn', 'Skipping Stage C (--skip-save). Data saved to .temp/ only.');
    }

    console.error('');
    const endTime = new Date().toISOString();
    log('ok', `Workflow completed at ${endTime}`);
    log('info', `Hotel: "${scrapedData.name}" | Slug: ${slug} | URL: ${targetUrl}`);

    if (!args.skipSave) {
      log('info', `View in Firestore: hotels/${slug}`);
    }

    // Output kết quả JSON cho pipeline
    console.log(JSON.stringify({
      success: true,
      hotel: scrapedData.name,
      slug,
      url: targetUrl,
      saved: !args.skipSave,
      timestamp: endTime,
    }));

    process.exit(0);
  } catch (err) {
    console.error('');
    log('err', `Workflow failed: ${err.message}`);
    console.error('');

    // Output error JSON
    console.log(JSON.stringify({
      success: false,
      error: err.message,
      hotel: args.hotel || null,
      url: targetUrl || null,
    }));

    process.exit(1);
  }
}

main();
