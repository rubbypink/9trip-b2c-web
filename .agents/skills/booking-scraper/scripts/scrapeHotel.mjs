/**
 * Hotel Scraper — Playwright-based extraction (no Firecrawl dependency).
 *
 * Two modes:
 *   1. AI Agent Mode: Playwright MCP → extractFromDOM → process
 *   2. CLI Mode: Provide markdown/pageText → process
 *
 * @module scrapeHotel
 */
import { findAdapter } from '../../../lib/adapters/index.mjs';
import { markdownToJson } from '../../../lib/markdown-to-json.mjs';
import { extractPricing } from '../../../lib/pricing-extractor.mjs';
import { mapHotelToFirestore } from '../../../lib/schemas/hotel-schema.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import { writeJsonToTemp, slugify } from '../../../lib/scrape-helpers.mjs';
import { normalizeImageUrl, deduplicateUrls } from '../../../lib/image-helpers.mjs';
import fs from 'fs';

/**
 * Scrape hotel data from page text.
 * @param {string} pageText - Full page text/markdown
 * @param {string} url - Source URL
 * @returns {Promise<Object>}
 */
export async function scrapeHotelFromText(pageText, url) {
  const timeline = [];
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  log('A', 'start', `URL: ${url}`);

  // Convert markdown to structured JSON
  let rawData = markdownToJson(pageText, 'hotel', url);

  // Enrich with domain adapter
  const adapter = await findAdapter(url);
  if (adapter && adapter.extractFromMarkdown) {
    const enriched = adapter.extractFromMarkdown(pageText, url);
    rawData = { ...rawData, ...enriched };
  }

  // Mandatory pricing
  const pricing = extractPricing(rawData, 'hotel');
  if (!pricing.found) {
    log('B', 'warn', `Missing pricing: ${pricing.missing.join(', ')}`);
  }
  rawData = { ...rawData, ...pricing };

  log('B', 'ok', `Hotel: "${rawData.name || rawData.title || 'N/A'}", ${Object.keys(rawData).length} fields`);

  return processAndSave(rawData, url, timeline);
}

async function processAndSave(rawData, url, timeline) {
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  const name = rawData.name || rawData.title;
  if (!name) {
    log('C', 'fail', 'No hotel name found');
    return { success: false, error: 'Could not extract hotel name', timeline };
  }

  // Normalize images
  if (rawData.gallery) rawData.gallery = deduplicateUrls(rawData.gallery.map((u) => normalizeImageUrl(u, 1024)));
  if (rawData.featuredImage) rawData.featuredImage = normalizeImageUrl(rawData.featuredImage, 1024);

  const mappedData = mapHotelToFirestore(rawData);
  mappedData._sourceUrl = url;

  const sourceDomain = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
  const sanitized = await sanitizeScrapedData(mappedData, {
    type: 'hotel',
    knownNames: [sourceDomain, name].filter(Boolean),
  });

  const slug = sanitized.data.slug || slugify(sanitized.data.name);
  sanitized.data._sourceUrl = url;

  const tempFile = await writeJsonToTemp(sanitized.data, slug, 'booking-hotel');
  log('C', 'ok', `Saved to ${tempFile}`);

  return { success: true, slug, data: sanitized.data, tempFile, timeline };
}

async function main() {
  const args = {};
  process.argv.slice(2).forEach((a) => { const m = a.match(/^--(\w+)=(.+)$/); if (m) args[m[1]] = m[2]; });

  if (args.markdown) {
    const text = fs.readFileSync(args.markdown, 'utf-8');
    const result = await scrapeHotelFromText(text, args.url || 'https://unknown.com');
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
  } else {
    console.log(JSON.stringify({
      status: 'ready_for_extraction',
      message: 'Use Playwright MCP to navigate, extract page text, then call scrapeHotelFromText(pageText, url)',
    }, null, 2));
  }
}

if (process.argv[1] === (await import('url')).fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
