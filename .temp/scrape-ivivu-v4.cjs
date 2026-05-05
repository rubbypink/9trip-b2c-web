const FIRECRAWL_API_KEY = 'fc-4c9478779f0c4a2b829ae91e7fda9d89';
const FIRECRAWL_API = 'https://api.firecrawl.dev/v1';
const LIST_URL = 'https://www.ivivu.com/du-lich/tour-phu-quoc';
const fs = require('fs');

async function callFireCrawl(endpoint, body) {
  const res = await fetch(`${FIRECRAWL_API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`FireCrawl error ${res.status}: ${text.slice(0, 500)}`); }
  return res.json();
}

async function main() {
  console.log('Scraping ivivu list page...');
  const result = await callFireCrawl('/scrape', {
    url: LIST_URL,
    formats: ['markdown'],
    actions: [
      { type: 'wait', milliseconds: 3000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 2000 },
    ],
    onlyMainContent: false,
    timeout: 120000,
  });

  if (!result.data?.markdown) {
    console.log('No markdown received');
    return;
  }

  const md = result.data.markdown;
  fs.writeFileSync('.temp/ivivu-raw.md', md);
  console.log('Markdown length:', md.length);

  // Extract Phu Quoc tour detail URLs (with numeric IDs)
  const tourUrlRegex = /https:\/\/www\.ivivu\.com\/du-lich\/tour-[a-z0-9-]+\/\d+/g;
  const urls = md.match(tourUrlRegex) || [];
  const uniqueUrls = [...new Set(urls.map(u => u.replace(/[)\].]+$/, '')))];
  
  console.log(`\nFound ${uniqueUrls.length} Phu Quoc tour detail URLs:`);
  uniqueUrls.forEach((u, i) => console.log(`  ${i+1}. ${u}`));
  
  if (uniqueUrls.length > 0) {
    fs.writeFileSync('.temp/ivivu-phu-quoc-tours.json', JSON.stringify(uniqueUrls, null, 2));
    console.log(`\nSaved to .temp/ivivu-phu-quoc-tours.json`);
  }
  
  // Also try scraping the first tour as a test
  if (uniqueUrls.length > 0) {
    const testUrl = uniqueUrls[0];
    console.log(`\n--- Testing scrape on first tour: ${testUrl} ---`);
    try {
      const detail = await callFireCrawl('/scrape', {
        url: testUrl,
        formats: ['json'],
        jsonOptions: {
          prompt: 'Extract structured tour data from this ivivu.com page. Return JSON with: title, duration, durationDays, location, address, description (full HTML), excerpt, featuredImage, gallery array, highlights array, included array, excluded array, itinerary array (day, title, description, meals, overnight, images), pricing object (adultPrice, childPrice, infantPrice, currency, minPeople, maxPeople), cancellationPolicy, childrenPolicy, notes array, faq array, rating object (average, count).',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              duration: { type: 'string' },
              durationDays: { type: 'number' },
              location: { type: 'string' },
              address: { type: 'string' },
              description: { type: 'string' },
              excerpt: { type: 'string' },
              featuredImage: { type: 'string' },
              gallery: { type: 'array', items: { type: 'string' } },
              highlights: { type: 'array', items: { type: 'string' } },
              included: { type: 'array', items: { type: 'string' } },
              excluded: { type: 'array', items: { type: 'string' } },
              itinerary: { type: 'array', items: { type: 'object', properties: { day: { type: 'number' }, title: { type: 'string' }, description: { type: 'string' }, meals: { type: 'string' }, overnight: { type: 'string' }, images: { type: 'array', items: { type: 'string' } } }, required: ['day'] } },
              pricing: { type: 'object', properties: { adultPrice: { type: 'number' }, childPrice: { type: 'number' }, infantPrice: { type: 'number' }, currency: { type: 'string' } } },
              cancellationPolicy: { type: 'string' },
              childrenPolicy: { type: 'string' },
              notes: { type: 'array', items: { type: 'string' } },
              faq: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } } } },
              rating: { type: 'object', properties: { average: { type: 'number' }, count: { type: 'number' } } },
            },
            required: ['title'],
          },
        },
        waitFor: 3000,
        timeout: 60000,
      });
      console.log('Detail result:', JSON.stringify(detail.data?.json || {}, null, 2).slice(0, 3000));
      fs.writeFileSync('.temp/ivivu-first-tour-detail.json', JSON.stringify(detail, null, 2));
    } catch (err) {
      console.log('Detail scrape failed:', err.message);
    }
  }
}

main().catch(console.error);
