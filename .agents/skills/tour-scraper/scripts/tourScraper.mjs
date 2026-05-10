/**
 * Tour Scraper — Playwright-based extraction with lazy rendering support.
 *
 * Three modes:
 *   1. AI Agent Mode: Playwright MCP navigates → extractFromDOM → process
 *   2. CLI Mode: Provide markdown/pageText → markdownToJson → process  
 *   3. Lazy Rendering Mode: agent-browser CLI → interactions → extract
 *
 * Usage:
 *   node tourScraper.mjs --url=https://www.ivivu.com/du-lich/tour/...
 *   node tourScraper.mjs --url=https://... --lazy-rendering
 *   node tourScraper.mjs --markdown=path/to/markdown.md
 *
 * @module tourScraper
 * @version 2.0.0
 */
import { findAdapter } from '../../../lib/adapters/index.mjs';
import { markdownToJson } from '../../../lib/markdown-to-json.mjs';
import { extractPricing } from '../../../lib/pricing-extractor.mjs';
import {
  TOUR_SCHEMA,
  mapTourToFirestore,
} from '../../../lib/scape-schemas.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import { writeJsonToTemp, slugify } from '../../../lib/scrape-helpers.mjs';
import { normalizeImageUrl, deduplicateUrls } from '../../../lib/image-helpers.mjs';
import fs from 'fs';

/**
 * Scrape a single tour from page text (markdown or raw HTML text).
 * Use this when you have the page content already.
 *
 * @param {string} pageText - Full page markdown/text content
 * @param {string} url - Source URL
 * @returns {Promise<Object>} Scraped and mapped tour data
 */
export async function scrapeTourFromText(pageText, url) {
  const timeline = [];
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  log('A', 'start', `URL: ${url}`);

  // Step 1: Convert markdown to structured JSON
  let rawData = markdownToJson(pageText, 'tour', url);

  // Step 2: Enrich with adapter if available
  const adapter = await findAdapter(url);
  if (adapter && adapter.extractFromMarkdown) {
    const enriched = adapter.extractFromMarkdown(pageText, url);
    rawData = { ...rawData, ...enriched };
  }

  // Step 3: Process lazy content hints if available
  if (adapter && adapter.processLazyContent) {
    const lazyData = adapter.processLazyContent(pageText);
    if (lazyData.childPricingHints?.length > 0) {
      rawData.childPricingHints = lazyData.childPricingHints;
      // Set childPrice if found
      const childPrice = lazyData.childPricingHints.find(h => h.type === 'child');
      if (childPrice && !rawData.childPrice) {
        rawData.childPrice = childPrice.price;
      }
    }
    if (lazyData.detailedItinerary?.length > 0) {
      rawData.itinerary = lazyData.detailedItinerary;
    }
  }

  // Step 4: Mandatory child pricing
  const pricing = extractPricing(rawData, 'tour');
  if (!pricing.found) {
    log('B', 'warn', `Missing pricing fields: ${pricing.missing.join(', ')}`);
  }
  rawData = { ...rawData, ...pricing };

  log('B', 'ok', `Title: "${rawData.title || 'N/A'}", ${Object.keys(rawData).length} fields`);

  // Step 5: Normalize & map
  return processAndSave(rawData, url, timeline);
}

/**
 * Scrape tour with lazy rendering support using agent-browser CLI.
 * This mode interacts with the page to reveal hidden content.
 *
 * @param {string} url - Tour URL
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} Scraped tour data
 */
export async function scrapeTourWithLazyRendering(url, options = {}) {
  const timeline = [];
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  log('A', 'start', `Lazy rendering mode: ${url}`);

  // Dynamically import browser-automation to avoid loading if not needed
  const { extractWithInteractions, getSnapshot } = await import('../../../lib/browser-automation.mjs');
  const adapter = await findAdapter(url);

  // Get lazy rendering steps from adapter
  let steps = [];
  if (adapter && adapter.getLazyRenderingSteps) {
    steps = adapter.getLazyRenderingSteps();
    log('B', 'info', `Loaded ${steps.length} interaction steps from adapter`);
  }

  // Extract with interactions
  let extractionResult;
  try {
    extractionResult = await extractWithInteractions(url, steps);
    log('B', 'ok', `Extraction completed, ${extractionResult.snapshots?.length || 0} snapshots`);
  } catch (e) {
    log('B', 'fail', `Extraction failed: ${e.message}`);
    throw e;
  }

  // Get final page text
  const pageText = extractionResult.data?.bodyText || '';
  
  // Process with adapter
  let rawData = {};
  if (adapter && adapter.extractFromMarkdown) {
    rawData = adapter.extractFromMarkdown(pageText, url);
    log('C', 'ok', `Adapter extracted ${Object.keys(rawData).length} fields`);
  } else {
    rawData = markdownToJson(pageText, 'tour', url);
  }

  // Process lazy content
  if (adapter && adapter.processLazyContent) {
    const lazyData = adapter.processLazyContent(pageText);
    
    if (lazyData.childPricingHints?.length > 0) {
      rawData.childPricingHints = lazyData.childPricingHints;
      const childPrice = lazyData.childPricingHints.find(h => h.type === 'child');
      const infantPrice = lazyData.childPricingHints.find(h => h.type === 'infant');
      if (childPrice && !rawData.childPrice) {
        rawData.childPrice = childPrice.price;
      }
      if (infantPrice && !rawData.infantPrice) {
        rawData.infantPrice = infantPrice.price;
      }
      log('C', 'ok', `Found ${lazyData.childPricingHints.length} child pricing hints`);
    }
    
    if (lazyData.detailedItinerary?.length > 0) {
      rawData.itinerary = lazyData.detailedItinerary;
      log('C', 'ok', `Found ${lazyData.detailedItinerary.length} detailed itinerary days`);
    }
  }

  // Mandatory child pricing validation
  const pricing = extractPricing(rawData, 'tour');
  rawData = { ...rawData, ...pricing };

  // Mark as lazy rendering mode
  rawData._lazyRendering = true;
  rawData._snapshotsCount = extractionResult.snapshots?.length || 0;

  log('D', 'ok', `Lazy rendering extraction complete`);

  return processAndSave(rawData, url, timeline);
}

/**
 * Process raw data — normalize, map to Firestore schema, sanitize, save temp.
 */
async function processAndSave(rawData, url, timeline) {
  const log = (p, s, d) => timeline.push({ phase: p, status: s, detail: d, time: new Date().toISOString() });

  if (!rawData.title) {
    log('E', 'fail', 'No title found');
    return { success: false, error: 'Could not extract tour title', timeline };
  }

  // Normalize gallery
  if (rawData.gallery && Array.isArray(rawData.gallery)) {
    rawData.gallery = deduplicateUrls(rawData.gallery.map((u) => normalizeImageUrl(u, 1024)));
  }
  if (rawData.featuredImage) rawData.featuredImage = normalizeImageUrl(rawData.featuredImage, 1024);

  // Normalize adapter fields
  rawData = normalizeAdapterFields(rawData);

  // Map to Firestore
  const { tourData, pricingTiers } = mapTourToFirestore(rawData);
  tourData._sourceUrl = url;
  tourData._strategy = rawData._lazyRendering ? 'agent-browser-lazy' : 'playwright';
  if (rawData._snapshotsCount) {
    tourData._snapshotsCount = rawData._snapshotsCount;
  }

  // Sanitize
  const sourceDomain = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
  const sanitized = await sanitizeScrapedData(tourData, {
    type: 'tour',
    knownNames: [sourceDomain, 'ivivu', 'booking'].filter(Boolean),
  });

  const slug = slugify(sanitized.data.title || rawData.title);
  sanitized.data._sourceUrl = url;
  sanitized.data._pricingTiers = pricingTiers;
  sanitized.data._strategy = tourData._strategy;

  const tempFile = await writeJsonToTemp(sanitized.data, slug, 'scraped-tour');
  log('E', 'ok', `Saved to ${tempFile} (${tourData._strategy})`);

  return { 
    success: true, 
    slug, 
    data: sanitized.data, 
    tempFile, 
    timeline,
    lazyRendering: rawData._lazyRendering || false,
  };
}

function normalizeAdapterFields(data) {
  const n = { ...data };
  if (n.departureCity && !n.address) n.address = n.departureCity;
  if (n.adultPrice !== undefined) {
    n.pricing = { 
      adultPrice: n.adultPrice, 
      childPrice: n.childPrice || null, 
      infantPrice: n.infantPrice || null,
      currency: n.currency || 'VND' 
    };
    delete n.adultPrice; 
    delete n.childPrice; 
    delete n.infantPrice;
    delete n.currency;
  }
  if (Array.isArray(n.itinerary)) {
    n.itinerary = n.itinerary.map((d, i) => ({ 
      day: d.day || i + 1, 
      title: d.title || `Ngày ${d.day || i + 1}`, 
      description: d.description || '', 
      meals: d.meals || '' 
    }));
  }
  if (!n.featuredImage && n.ogImage) n.featuredImage = n.ogImage;
  return n;
}

// CLI
async function main() {
  const args = {};
  process.argv.slice(2).forEach((a) => { 
    const m = a.match(/^--([\w-]+)=(.+)$/); 
    if (m) args[m[1]] = m[2]; 
  });

  const url = args.url;
  const markdownFile = args.markdown;
  const lazyRendering = args['lazy-rendering'] === 'true' || args.lazyRendering === 'true' || args.lazy === 'true';

  if (!url && !markdownFile) {
    console.error('Usage: node tourScraper.mjs --url=https://... [--lazy-rendering=true]');
    console.error('       node tourScraper.mjs --markdown=path/to/file.md');
    process.exit(1);
  }

  let result;
  
  if (markdownFile) {
    // Mode 2: Process from markdown file
    const text = fs.readFileSync(markdownFile, 'utf-8');
    result = await scrapeTourFromText(text, url || 'https://unknown.com');
  } else if (lazyRendering) {
    // Mode 3: Lazy rendering with agent-browser CLI
    try {
      result = await scrapeTourWithLazyRendering(url);
    } catch (e) {
      console.error(JSON.stringify({ 
        success: false, 
        error: e.message,
        mode: 'lazy-rendering'
      }, null, 2));
      process.exit(1);
    }
  } else {
    // Mode 1: Standard extraction (requires agent to provide page text)
    console.log(JSON.stringify({
      status: 'ready_for_extraction',
      url,
      modes: ['standard', 'lazy-rendering'],
      message: 'Use Playwright MCP or agent-browser CLI to navigate and extract page text, then call scrapeTourFromText(pageText, url)',
      adapter: (await findAdapter(url)) ? 'available' : 'none',
      lazyRenderingAvailable: !!(await findAdapter(url))?.getLazyRenderingSteps,
    }, null, 2));
    process.exit(0);
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exit(1);
}

if (process.argv[1] === (await import('url')).fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
