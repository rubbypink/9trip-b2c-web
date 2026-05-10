/**
 * batchScrapeHotelOnBooking.mjs — Batch hotel scraper using agent-browser.
 *
 * Replaces legacy FireCrawl batchScrape with sequential agent-browser calls:
 * - Iterates over hotel URLs one by one
 * - Each URL is scraped via scrapeHotelFromUrl() from getHotelImages.mjs
 * - Results are saved to Firestore via saveBookingDataSkill.mjs CLI
 *
 * Usage:
 *   node batchScrapeHotelOnBooking.mjs
 *
 * @module batchScrapeHotelOnBooking
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { scrapeHotelFromUrl } from './getHotelImages.mjs';
import { loadEnvConfig } from '../../../lib/firebase-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Logging
// ============================================================================

/**
 * Log a message to stderr.
 * @param {'info'|'warn'|'error'} level
 * @param {string} message
 */
function log(level, message) {
  const prefix = { info: '[9Trip-Log]', warn: '[9Trip-Warn]', error: '[9Trip-Error]' }[level] || '[9Trip]';
  console.error(`${prefix} ${message}`);
}

// ============================================================================
// Database Saver
// ============================================================================

/**
 * Save scraped hotel data to Firestore by invoking saveBookingDataSkill.mjs.
 * Writes data to a temp JSON file, then calls the save script via child process.
 * @param {Object[]} data - Array of hotel data objects
 * @returns {Promise<string>} stdout from save script
 */
async function saveToDatabaseViaCLI(data) {
  const tempPath = path.resolve(`./temp_booking_data_${Date.now()}.json`);

  log('info', `Writing ${data.length} records to temp file: ${tempPath}`);
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');

  const cmd = `node "${path.join(__dirname, 'saveBookingDataSkill.mjs')}" --input="${tempPath}"`;
  log('info', `Executing: ${cmd}`);

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        log('error', `saveBookingData failed: ${error.message}`);
        if (stderr) log('error', `Detail: ${stderr}`);
        return reject(error);
      }
      log('info', `Save result:\n${stdout}`);
      resolve(stdout);
    });
  });
}

// ============================================================================
// Batch Scrape
// ============================================================================

/**
 * Scrape multiple hotel URLs sequentially using agent-browser.
 * Each URL is processed one at a time to avoid overloading the browser.
 *
 * @param {string[]} targetUrls - Array of booking.com hotel detail URLs
 * @param {Object} [options]
 * @param {number} [options.concurrency=1] - Number of concurrent scrapes (default 1)
 * @param {boolean} [options.saveToDb=true] - Whether to save results to DB
 * @returns {Promise<{success: boolean, results: Object[], errors: Object[], count: number}>}
 */
export async function scrapeHotelsBatch(targetUrls, options = {}) {
  const { concurrency = 1, saveToDb = true } = options;

  if (!targetUrls || !Array.isArray(targetUrls) || targetUrls.length === 0) {
    return { success: false, results: [], errors: [{ url: null, error: 'No URLs provided' }], count: 0 };
  }

  log('info', `Starting batch scrape for ${targetUrls.length} hotels (concurrency: ${concurrency})...`);

  /** @type {Object[]} */
  const results = [];
  /** @type {Array<{url: string, error: string}>} */
  const errors = [];

  // Sequential processing (concurrency=1 is default for browser stability)
  for (let i = 0; i < targetUrls.length; i++) {
    const url = targetUrls[i];
    log('info', `[${i + 1}/${targetUrls.length}] Scraping: ${url}`);

    try {
      const result = await scrapeHotelFromUrl(url);
      if (result.success && result.data) {
        results.push(result.data);
        log('info', `[${i + 1}/${targetUrls.length}] ✅ Success: "${result.data.name || 'Unknown'}"`);
      } else {
        errors.push({ url, error: result.error || 'Unknown error' });
        log('warn', `[${i + 1}/${targetUrls.length}] ❌ Failed: ${result.error}`);
      }
    } catch (err) {
      errors.push({ url, error: err.message });
      log('error', `[${i + 1}/${targetUrls.length}] ❌ Error: ${err.message}`);
    }
  }

  log('info', `Batch complete: ${results.length} success, ${errors.length} failures out of ${targetUrls.length}`);

  // Save to database if requested
  if (saveToDb && results.length > 0) {
    try {
      await saveToDatabaseViaCLI(results);
    } catch (err) {
      log('error', `Failed to save to database: ${err.message}`);
    }
  }

  return { success: errors.length === 0, results, errors, count: results.length };
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadEnvConfig();

  const testUrls = [
    'https://www.booking.com/hotel/vn/thien-thanh-thanh-pho-phu-quoc.vi.html',
    'https://www.booking.com/hotel/vn/sunset-beach-phu-quoc-resort-amp-spa.vi.html',
    'https://www.booking.com/hotel/vn/salinda-premium-resort-and-spa.vi.html',
    'https://www.booking.com/hotel/vn/crowne-plaza-phu-quoc-starbay.vi.html',
    'https://www.booking.com/hotel/vn/radisson-blu-resort-phu-quoc.vi.html',
    'https://www.booking.com/hotel/vn/vinpearl-resort-phu-quoc.vi.html',
    'https://www.booking.com/hotel/vn/m-phu-quoc.vi.html',
    'https://www.booking.com/hotel/vn/la-festa-phu-quoc-curio-collection-by-hilton.vi.html',
    'https://www.booking.com/hotel/vn/sheraton-phu-quoc-long-beach-resort.vi.html',
    'https://www.booking.com/hotel/vn/montana-resort-thanh-pho-phu-quoc.vi.html',
  ];

  scrapeHotelsBatch(testUrls, { concurrency: 1, saveToDb: true })
    .then((result) => {
      log('info', `Final: ${result.count}/${testUrls.length} hotels saved successfully.`);
      process.exit(result.count > 0 ? 0 : 1);
    })
    .catch((err) => {
      log('error', `Batch failed: ${err.message}`);
      process.exit(1);
    });
}
