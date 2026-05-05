const FIRECRAWL_API_KEY = 'fc-4c9478779f0c4a2b829ae91e7fda9d89';
const FIRECRAWL_API = 'https://api.firecrawl.dev/v1';
const LIST_URL = 'https://www.ivivu.com/du-lich/tour-phu-quoc';
const fs = require('fs');

async function callFireCrawl(endpoint, body) {
  console.log(`[API] POST ${endpoint}`);
  const res = await fetch(`${FIRECRAWL_API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const text = await res.text(); throw new Error(`FireCrawl error ${res.status}: ${text.slice(0, 500)}`); }
  return res.json();
}

async function main() {
  // Try scrape with actions first
  try {
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

    if (result.data?.markdown) {
      const md = result.data.markdown;
      console.log('Markdown length:', md.length);
      fs.writeFileSync('.temp/ivivu-raw.md', md);
      
      // Extract URLs
      const urlRegex = /https:\/\/www\.ivivu\.com\/du-lich\/tour[^\s"')>]+/g;
      const urls = md.match(urlRegex) || [];
      const clean = [...new Set(urls.map(u => u.split('?')[0].replace(/[)\].]+$/, '')))];
      console.log('Tour URLs found:', clean.length);
      clean.forEach((u, i) => console.log(`  ${i+1}. ${u}`));
      
      if (clean.length > 0) {
        fs.writeFileSync('.temp/ivivu-tour-urls.json', JSON.stringify(clean, null, 2));
      }
      
      // Also try to extract tour blocks with regex
      const tourBlocks = md.match(/(?:##|###)\s+\[?[^\]]*\]?\(?https:\/\/www\.ivivu\.com\/du-lich\/tour[^)]+\)?[\s\S]*?(?=(?:##|###|$))/g);
      if (tourBlocks) console.log('Tour blocks:', tourBlocks.length);
      
      return;
    }
    console.log('No markdown, full result:', JSON.stringify(result).slice(0, 2000));
  } catch (err) {
    console.log('Scrape failed:', err.message);
  }
  
  // Fallback: try to get just the HTML
  try {
    console.log('\nTrying direct HTML fetch...');
    const res = await fetch(LIST_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    console.log('HTML length:', html.length);
    fs.writeFileSync('.temp/ivivu-raw.html', html);
    
    const tourUrlRegex = /https:\/\/www\.ivivu\.com\/du-lich\/tour-[a-z0-9-]+/g;
    const urls = html.match(tourUrlRegex) || [];
    console.log('Tour URLs from HTML:', [...new Set(urls)]);
  } catch (err) {
    console.log('Direct fetch failed:', err.message);
  }
}

main().catch(console.error);
