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
 * Scrape activity data from a URL using browser automation (lazy rendering mode).
 * Extracts page content via Playwright, then processes with scrapeActivityFromText.
 * Merges per-tier child pricing data from browser interaction into the result.
 *
 * @param {string} url - Activity page URL
 * @param {Object} [options] - Scraping options
 * @param {number} [options.startIndex] - First button index for parallel splitting
 * @param {number} [options.endIndex] - Last button index exclusive for parallel splitting
 * @param {number} [options.chunkSize] - Number of tiers per chunk callback
 * @param {Function} [options.onChunk] - Callback receiving partial pricing data chunks
 * @returns {Promise<Object>} Scraped and mapped activity data with merged child pricing
 */
export async function scrapeActivityFromUrl(url, options = {}) {
  const timeline = [];
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  log('A', 'start', `URL: ${url} (lazy rendering mode)`);

  // Step 1: Extract page data with browser automation (forward options for v2)
  const { extractActivityPage } = await import('../../../lib/browser-automation.mjs');
  const extractionOpts = {};
  if (options.startIndex !== undefined) extractionOpts.startIndex = options.startIndex;
  if (options.endIndex !== undefined) extractionOpts.endIndex = options.endIndex;
  if (options.chunkSize !== undefined) extractionOpts.chunkSize = options.chunkSize;
  if (options.onChunk) extractionOpts.onChunk = options.onChunk;
  if (options.headed !== undefined) extractionOpts.headed = options.headed;

  const extractResult = await extractActivityPage(url, extractionOpts);

  if (!extractResult.success) {
    log('A', 'fail', `Extraction failed: ${extractResult.error || 'unknown'}`);
    return { success: false, error: 'Failed to extract activity page', timeline };
  }

  const { data, childPrices, childPricing, pricingData } = extractResult;
  const pageText = data?.bodyText || '';

  log('B', 'ok', `Extracted page data, ${pageText.length} chars, ${Object.keys(childPrices || {}).length} tier child prices, ${pricingData?.length || 0} iVIVU pricing entries`);

  // Step 2: Process with scrapeActivityFromText
  const scrapeResult = await scrapeActivityFromText(pageText, url, data?.title, pricingData);

  if (!scrapeResult.success) {
    log('C', 'fail', `Scrape failed: ${scrapeResult.error}`);
    return scrapeResult;
  }

  // Step 3: Merge per-tier child pricing data (from generic extraction)
  if (childPrices && Object.keys(childPrices).length > 0) {
    for (const [tierIndex, priceData] of Object.entries(childPrices)) {
      const idx = parseInt(tierIndex);
      if (idx < scrapeResult.data.pricing.tiers.length && priceData.childPrice) {
        scrapeResult.data.pricing.tiers[idx].childPrice = priceData.childPrice;
      }
    }
  }
  if (childPricing) {
    if (childPricing.childPrice && !scrapeResult.data.pricing.childPrice) scrapeResult.data.pricing.childPrice = childPricing.childPrice;
    if (childPricing.infantPrice && !scrapeResult.data.pricing.infantPrice) scrapeResult.data.pricing.infantPrice = childPricing.infantPrice;
    if (childPricing.seniorPrice && !scrapeResult.data.pricing.seniorPrice) scrapeResult.data.pricing.seniorPrice = childPricing.seniorPrice;
  }
  
  // Step 3b: Merge iVIVU pricing data if available
  if (pricingData && pricingData.length > 0) {
    log('C', 'info', `Merging ${pricingData.length} iVIVU pricing tiers`);
    
    // Convert pricingData to proper tier format
    const ivivuTiers = pricingData
      .filter(p => p.adultPrice || p.tierName)
      .map((p, idx) => ({
        id: `price_${slugify(p.tierName || `tier-${idx + 1}`)}`,
        name: p.tierName || `Gói ${idx + 1}`,
        description: p.description || '',
        adultPrice: p.adultPrice || 0,
        childPrice: p.childPrice !== null ? p.childPrice : 0,
        infantPrice: p.infantPrice !== null ? p.infantPrice : 0,
        currency: p.currency || 'VND'
      }));
    
    // Replace or merge tiers
    if (ivivuTiers.length > 0) {
      // If we have more detailed pricing from iVIVU, use it
      if (scrapeResult.data.pricing.tiers.length === 0 || ivivuTiers.length >= scrapeResult.data.pricing.tiers.length) {
        scrapeResult.data.pricing.tiers = ivivuTiers;
        // Update basePrice to lowest adult price
        const prices = ivivuTiers.map(t => t.adultPrice).filter(p => p > 0);
        if (prices.length > 0) {
          scrapeResult.data.pricing.basePrice = Math.min(...prices);
        }
      } else {
        // Merge child prices into existing tiers
        ivivuTiers.forEach((ivivuTier, idx) => {
          if (idx < scrapeResult.data.pricing.tiers.length && ivivuTier.childPrice !== undefined) {
            scrapeResult.data.pricing.tiers[idx].childPrice = ivivuTier.childPrice;
            scrapeResult.data.pricing.tiers[idx].infantPrice = ivivuTier.infantPrice;
          }
        });
      }
    }
  }

  log('C', 'ok', 'Merged child pricing data');

  return scrapeResult;
}

/**
 * Scrape activity data from page text.
 * @param {string} pageText - Full page text/markdown
 * @param {string} url - Source URL
 * @param {string} pageTitle - Page title from browser
 * @param {Array} [pricingData] - Optional pricing data from iVIVU extraction
 * @returns {Promise<Object>}
 */
export async function scrapeActivityFromText(pageText, url, pageTitle = '', pricingData = null) {
  const timeline = [];
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  log('A', 'start', `URL: ${url}`);

  let rawData = markdownToJson(pageText, 'activity', url);

  const adapter = await findAdapter(url);
  if (adapter && adapter.extractFromMarkdown) {
    rawData = { ...rawData, ...adapter.extractFromMarkdown(pageText, url) };
  }

  if (!rawData.title && pageTitle) {
    rawData.title = pageTitle.split(' - ')[0].replace(/^"|"$/g, '').trim();
  }

  // If we have iVIVU pricing data, use it instead of extracting from text
  if (pricingData && pricingData.length > 0) {
    log('A', 'info', `Using ${pricingData.length} pricing tiers from iVIVU extraction`);
    rawData.pricing = {
      tiers: pricingData
        .filter(p => p.adultPrice || p.tierName)
        .map((p, idx) => ({
          id: `price_${slugify(p.tierName || `tier-${idx + 1}`)}`,
          name: p.tierName || `Gói ${idx + 1}`,
          description: p.description || '',
          adultPrice: p.adultPrice || 0,
          childPrice: p.childPrice !== null ? p.childPrice : 0,
          infantPrice: p.infantPrice !== null ? p.infantPrice : 0,
          currency: p.currency || 'VND'
        })),
      currency: 'VND'
    };
    // Set basePrice to lowest adult price across tiers
    const prices = rawData.pricing.tiers.map(t => t.adultPrice).filter(p => p > 0);
    if (prices.length > 0) {
      rawData.pricing.basePrice = Math.min(...prices);
    }
  } else {
    const pricing = extractPricing(rawData, 'activity');
    if (!pricing.found) log('B', 'warn', `Missing pricing: ${pricing.missing.join(', ')}`);
    rawData = { ...rawData, ...pricing };
  }

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
