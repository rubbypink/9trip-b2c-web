/**
 * Activity Scraper — Playwright-based extraction (no Firecrawl dependency).
 *
 * @module activityScraper
 */
import { findAdapter } from '../../../lib/adapters/index.mjs';
import { markdownToJson } from '../../../lib/markdown-to-json.mjs';
import { extractPricing } from '../../../lib/pricing-extractor.mjs';
import { mapActivityToFirestore } from '../../../lib/schemas/activity-schema.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import { writeJsonToTemp, slugify } from '../../../lib/scrape-helpers.mjs';
import { normalizeImageUrl, deduplicateUrls } from '../../../lib/image-helpers.mjs';
import fs from 'fs';

/**
 * Scrape activity data from page text.
 * @param {string} pageText - Full page text/markdown
 * @param {string} url - Source URL
 * @returns {Promise<Object>}
 */
export async function scrapeActivityFromText(pageText, url) {
  const timeline = [];
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  log('A', 'start', `URL: ${url}`);

  let rawData = markdownToJson(pageText, 'activity', url);

  const adapter = await findAdapter(url);
  if (adapter && adapter.extractFromMarkdown) {
    rawData = { ...rawData, ...adapter.extractFromMarkdown(pageText, url) };
  }

  const pricing = extractPricing(rawData, 'activity');
  if (!pricing.found) log('B', 'warn', `Missing pricing: ${pricing.missing.join(', ')}`);
  rawData = { ...rawData, ...pricing };

  log('B', 'ok', `Activity: "${rawData.title || 'N/A'}", ${Object.keys(rawData).length} fields`);

  return processAndSave(rawData, url, timeline);
}

async function processAndSave(rawData, url, timeline) {
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  if (!rawData.title) {
    log('C', 'fail', 'No activity title found');
    return { success: false, error: 'Could not extract activity title', timeline };
  }

  if (rawData.gallery) rawData.gallery = deduplicateUrls(rawData.gallery.map((u) => normalizeImageUrl(u, 1024)));
  if (rawData.featuredImage) rawData.featuredImage = normalizeImageUrl(rawData.featuredImage, 1024);

  let activityData = mapActivityToFirestore(rawData);
  activityData._sourceUrl = url;

  const sourceDomain = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
  const sanitized = await sanitizeScrapedData(activityData, {
    type: 'activity',
    knownNames: [sourceDomain].filter(Boolean),
  });

  const slug = sanitized.data.slug || slugify(sanitized.data.title);
  sanitized.data._sourceUrl = url;

  const tempFile = await writeJsonToTemp(sanitized.data, slug, 'scraped-activity');
  log('C', 'ok', `Saved to ${tempFile}`);

  return { success: true, slug, data: sanitized.data, tempFile, timeline };
}

async function main() {
  const args = {};
  process.argv.slice(2).forEach((a) => { const m = a.match(/^--(\w+)=(.+)$/); if (m) args[m[1]] = m[2]; });

  if (args.markdown) {
    const text = fs.readFileSync(args.markdown, 'utf-8');
    const result = await scrapeActivityFromText(text, args.url || 'https://unknown.com');
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
  } else {
    console.log(JSON.stringify({
      status: 'ready_for_extraction',
      message: 'Use Playwright MCP to navigate, extract page text, then call scrapeActivityFromText(pageText, url)',
    }, null, 2));
  }
}

if (process.argv[1] === (await import('url')).fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
