/**
 * Firecrawl Agent wrapper — simplified scraping using both extract() and agent() APIs.
 *
 * Two modes:
 *   - extract(): LLM-powered structured extraction from page content (cheap, 5-15 credits)
 *     Best for: static pages where all content is in the HTML
 *   - agent(): Full browser automation with clicking, scrolling, navigation (100-500+ credits)
 *     Best for: pages with lazy-loaded galleries, accordion-hidden content, JS-heavy rendering
 *
 * Usage:
 *   const { initFirecrawl, scrapeWithExtract, scrapeWithAgent } = await import('./firecrawl-agent.mjs');
 *   const fc = initFirecrawl();
 *   const data = await scrapeWithExtract(fc, url, TOUR_AGENT_PROMPT, TOUR_EXTRACT_SCHEMA);
 */
import Firecrawl from '@mendable/firecrawl-js';
import { loadEnvConfig } from './firebase-helpers.mjs';

let _instance = null;

/**
 * Initialize Firecrawl client (singleton)
 * @param {string} [apiKey] - API key (falls back to FIRECRAWL_API_KEY env var)
 * @returns {Firecrawl}
 */
export function initFirecrawl(apiKey) {
  if (_instance) return _instance;
  loadEnvConfig();
  const key = apiKey || process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error('FIRECRAWL_API_KEY is required');
  _instance = new Firecrawl({ apiKey: key });
  return _instance;
}

/**
 * [DEAD CODE] — scrapeWithExtract: Never imported by any skill script.
 * The only consumer (getHotelImages.mjs) imports a non-existent 'firecrawl-agent.mjs' path
 * and only uses initFirecrawl + scrapeWithAgent.
 *
 * @param {Firecrawl} firecrawl - Initialized Firecrawl client
 * @param {string} url - URL to scrape
 * @param {string} prompt - Extraction prompt
 * @param {object} schema - JSON schema for structured extraction
 * @param {{pollInterval?: number, timeout?: number}} [options]
 * @returns {Promise<{data: object, creditsUsed: number}>}
 */
// export async function scrapeWithExtract(firecrawl, url, prompt, schema, options = {}) {
//   const { pollInterval = 5, timeout = 120 } = options;
//   const result = await firecrawl.extract({ urls: [url], prompt, schema, pollInterval, timeout });
//   if (!result.success) throw new Error(`Extract failed: ${result.error || 'Unknown error'}`);
//   return { data: result.data, creditsUsed: result.creditsUsed || 0 };
// }

/**
 * Scrape a URL using Firecrawl Agent — full browser automation.
 *
 * Agent autonomously handles: lazy render, popups, accordion expand, scroll, gallery click.
 * Costs 100-500+ credits per page. Use only when extract() fails or for JS-heavy pages.
 *
 * @param {Firecrawl} firecrawl - Initialized Firecrawl client
 * @param {string} url - URL to scrape
 * @param {string} prompt - Agent prompt
 * @param {object} schema - JSON schema for structured extraction
 * @param {{maxCredits?: number, pollInterval?: number, timeout?: number}} [options]
 * @returns {Promise<{data: object, creditsUsed: number}>}
 */
export async function scrapeWithAgent(firecrawl, url, prompt, schema, options = {}) {
  const { maxCredits = 100, pollInterval = 15000, timeout = 180000 } = options;

  // Step 1: Start the agent job (async — returns immediately with job ID)
  const job = await firecrawl.startAgent({
    urls: [url],
    prompt,
    schema,
    maxCredits,
  });

  if (!job.success || !job.id) {
    throw new Error(`Failed to start agent: ${job.error || 'No job ID returned'}`);
  }

  const jobId = job.id;
  const startTime = Date.now();

  // Step 2: Poll getAgentStatus() until completed
  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed > timeout) {
      throw new Error(`Agent timeout after ${timeout}ms (jobId: ${jobId})`);
    }

    const status = await firecrawl.getAgentStatus(jobId);

    if (status.status === 'completed') {
      return {
        data: status.data,
        creditsUsed: status.creditsUsed || 0,
      };
    }

    if (status.status === 'failed') {
      throw new Error(`Agent failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before polling again
    await new Promise((r) => setTimeout(r, pollInterval));
  }
}

// [DEAD CODE] — getFirecrawlClient: Never imported by any skill script
// export function getFirecrawlClient() {
//   return _instance;
// }
