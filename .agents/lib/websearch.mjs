/**
 * OpenRouter Web Search — find URLs using web search with firecrawl engine.
 * Used for Phase A of scrapers (finding hotel/tour/activity URLs).
 */
import { loadEnvConfig } from './firebase-helpers.mjs';

let _cache = {};

/**
 * Search the web for URLs
 * @param {string} query - Search query
 * @param {{engine?: string, maxResults?: number}} [options] - Options
 * @returns {Promise<{url: string, title: string, snippet: string}[]>}
 */
export async function searchForUrl(query, options = {}) {
  const { maxResults = 10 } = options;
  loadEnvConfig();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for web search');
  }

  const cacheKey = `${query}:${maxResults}`;
  if (_cache[cacheKey]) {
    return _cache[cacheKey];
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [
        {
          role: 'user',
          content: `Search the web for: "${query}". Return a JSON array of up to ${maxResults} search results, each with {url, title, snippet}. Return ONLY the JSON array, no other text.`,
        },
      ],
      tools: [
        {
          type: 'web_search_preview',
          engine: 'firecrawl',
        },
      ],
      tool_choice: { type: 'tool', name: 'web_search_preview' },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`OpenRouter API error ${response.status}: ${err.slice(0, 200)}`);
  }

  const result = await response.json();
  const toolCalls = result?.choices?.[0]?.message?.tool_calls || [];

  for (const call of toolCalls) {
    if (call.function?.arguments) {
      try {
        const parsed = JSON.parse(call.function.arguments);
        if (parsed.results && Array.isArray(parsed.results)) {
          const results = parsed.results.slice(0, maxResults).map((r) => ({
            url: r.url || r.link || '',
            title: r.title || '',
            snippet: r.snippet || r.description || '',
          }));
          _cache[cacheKey] = results;
          return results;
        }
        if (parsed.answer && Array.isArray(parsed.answer)) {
          const results = parsed.answer.slice(0, maxResults).map((r) => ({
            url: r.url || r.link || '',
            title: r.title || '',
            snippet: r.snippet || r.description || '',
          }));
          _cache[cacheKey] = results;
          return results;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return [];
}

/**
 * Search specifically for a URL on a domain
 * @param {string} siteName - Site to search on (e.g., 'booking.com')
 * @param {string} query - Search query (e.g., hotel name)
 * @returns {Promise<string|null>} - First matching URL or null
 */
export async function searchForSiteUrl(siteName, query) {
  const results = await searchForUrl(`site:${siteName} ${query}`, { maxResults: 5 });
  for (const r of results) {
    try {
      const url = new URL(r.url);
      if (url.hostname.includes(siteName)) {
        return r.url;
      }
    } catch {
      // invalid URL, skip
    }
  }
  return null;
}
