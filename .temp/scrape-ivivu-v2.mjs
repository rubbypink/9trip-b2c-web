import Firecrawl from '@mendable/firecrawl-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-4c9478779f0c4a2b829ae91e7fda9d89';
const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });

const LIST_URL = 'https://www.ivivu.com/du-lich/tour-phu-quoc';

try {
  console.log('Trying FireCrawl map...');
  const mapResult = await firecrawl.mapUrl(LIST_URL, {
    search: 'tour',
    limit: 30,
    includeSubdomains: true,
  });
  console.log('Map result:', JSON.stringify(mapResult, null, 2).slice(0, 3000));
  if (mapResult.links) fs.writeFileSync('.temp/ivivu-map.json', JSON.stringify(mapResult.links, null, 2));
} catch (err) {
  console.log('Map failed:', err.message);
}

try {
  console.log('\nTrying scrape with minimal options...');
  const result = await firecrawl.scrape('https://www.ivivu.com/du-lich/tour-phu-quoc', {
    formats: ['markdown'],
    onlyMainContent: true,
    timeout: 60000,
    waitFor: 2000,
  });
  if (result.success && result.data?.markdown) {
    fs.writeFileSync('.temp/ivivu-simple.md', result.data.markdown);
    console.log('Markdown saved, length:', result.data.markdown.length);
    const urlRegex = /https:\/\/www\.ivivu\.com[^\s"')>]+/g;
    const urls = result.data.markdown.match(urlRegex) || [];
    const tourUrls = [...new Set(urls)].filter(u => u.includes('/tour-') && !u.match(/\.(jpg|png|svg|ico|gif|webp|js|css)/));
    console.log('Tour URLs found:', tourUrls);
  } else {
    console.log('Scrape failed or no result');
  }
} catch (err) {
  console.log('Scrape failed:', err.message);
}
