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

const LIST_URL = 'https://www.ivivu.com/du-lich/tour-phu-quoc?date=2026-05-06&from=t%E1%BA%A5t%20c%E1%BA%A3&filltertime=3';

console.log('Scraping list page: ' + LIST_URL);
const result = await firecrawl.scrape(LIST_URL, {
  formats: ['markdown'],
  actions: [
    { type: 'wait', milliseconds: 3000 },
    { type: 'scroll', direction: 'down' },
    { type: 'wait', milliseconds: 2000 },
  ],
  onlyMainContent: true,
  removeBase64Images: true,
  blockAds: true,
  timeout: 180000,
});

if (result.success && result.data?.json?.tours?.length > 0) {
  const tours = result.data.json.tours;
  console.log('Found ' + tours.length + ' tours:');
  tours.forEach((t, i) => console.log((i+1) + '. ' + t.title + ' | ' + t.url + ' | ' + (t.price || 'N/A') + ' VND'));
  fs.mkdirSync('.temp', { recursive: true });
  fs.writeFileSync('.temp/ivivu-tour-list.json', JSON.stringify(tours, null, 2));
  console.log('\nSaved to .temp/ivivu-tour-list.json');
} else {
  if (result.data?.markdown) {
    const md = result.data.markdown;
    fs.writeFileSync('.temp/ivivu-markdown-full.txt', md);
    console.log('Markdown length:', md.length);
    console.log('Saved to .temp/ivivu-markdown-full.txt');

    const urlRegex = /https:\/\/www\.ivivu\.com\/[\w\d\/-]+(?:\.html)?/g;
    const allUrls = md.match(urlRegex) || [];
    const uniqueUrls = [...new Set(allUrls)].filter(u => u.includes('/tour-') || u.includes('/du-lich/'));
    console.log('\nExtracted tour URLs:', uniqueUrls);
  }
}
