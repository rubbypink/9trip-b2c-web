/**
 * Scraper Adapter Registry — maps source domains to extraction strategies.
 *
 * Each adapter provides:
 *   - extractFromDOM() — Playwright browser context extraction (0 Firecrawl credits)
 *   - extractFromMarkdown() — Firecrawl scrape() markdown extraction (1 credit)
 *   - extractFromPage() — Text-based extraction (generic adapter)
 *   - getInteractionSteps() — Pre-extraction automation steps
 *
 * The scraper pipeline picks the cheapest available method:
 *   Playwright DOM > scrape() markdown > extract() > agent()
 *
 * @module adapters
 * @version 1.1.0
 */

/**
 * Adapter registry: domain pattern → adapter module path
 * @constant {Object<string, string>}
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const ADAPTER_REGISTRY = {
  'ivivu.com': join(__dirname, 'ivivu-adapter.mjs'),
  'booking.com': join(__dirname, 'booking-adapter.mjs'),
  '*': join(__dirname, 'generic-adapter.mjs'), // Fallback for any domain
};

/**
 * Find adapter for a given URL.
 * @param {string} url - Source URL
 * @returns {Promise<Object|null>} Adapter module or null if no adapter found
 */
export async function findAdapter(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, adapterPath] of Object.entries(ADAPTER_REGISTRY)) {
      if (hostname.includes(domain)) {
        return await import(adapterPath);
      }
    }
  } catch {
    // Invalid URL or no adapter
  }
  return null;
}

// [DEAD CODE] — hasAdapter: Never imported by any skill script
// export function hasAdapter(url) {
//   try {
//     const hostname = new URL(url).hostname.replace(/^www\./, '');
//     return Object.keys(ADAPTER_REGISTRY).some((d) => hostname.includes(d));
//   } catch {
//     return false;
//   }
// }

// [DEAD CODE] — getInteractionSteps: Never imported by any skill script (skills use getLazyRenderingSteps from adapters directly)
// export async function getInteractionSteps(url) {
//   const adapter = await findAdapter(url);
//   if (adapter?.getInteractionSteps) {
//     return adapter.getInteractionSteps();
//   }
//   return [
//     { action: 'wait', selector: 'body', value: '2000', description: 'Wait for page to fully load' },
//     { action: 'scroll', selector: 'body', value: '500', description: 'Scroll to trigger lazy loading' },
//     { action: 'scroll', selector: 'body', value: '1000', description: 'Scroll further for more content' },
//   ];
// }

// [DEAD CODE] Default export — never imported as default
// export default { ADAPTER_REGISTRY, findAdapter, hasAdapter, getInteractionSteps };
