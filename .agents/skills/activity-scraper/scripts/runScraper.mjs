import { extractActivityPage } from '../../../lib/browser-automation.mjs';
import { slugify, stripHtml } from '../../../lib/scrape-helpers.mjs';
import fs from 'fs';
import path from 'path';



async function run() {
  const url = 'https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619';
  console.log(`Scraping ${url} with Playwright...`);
  
  // 1. Use Playwright to extract page content
  const extractResult = await extractActivityPage(url);
  
  if (!extractResult.success) {
    console.error("Failed to extract page");
    return;
  }
  
  // 2. Parse URL to get slug
  const slug = url.split('/').slice(-2, -1)[0] || slugify(extractResult.data.title);
  
  // 3. Map data to activity schema
  const https = await import('https');
  const html = await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  
  let result = {
    slug,
    title: extractResult.data.title.replace(/^"|"$/g, '').trim(),
    duration: '',
    location: 'Đà Nẵng',
    pricing: { basePrice: 0, currency: 'VND', tiers: [] },
    gallery: [],
    highlights: [],
    reviews: {},
    _sourceUrl: url
  };
  
  const scriptTag = '<script id="appid01-state" type="application/json">';
  const sIdx = html.indexOf(scriptTag);
  const eIdx = html.indexOf("</script>", sIdx);
  
  if (sIdx !== -1) {
    try {
      const raw = html.substring(sIdx + scriptTag.length, eIdx);
      const clean = raw
        .replace(/&q;/g, '"')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&a;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&l;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&g;/g, '>')
        .replace(/&#39;/g, "'");
        
      const stateData = JSON.parse(clean);
      const keys = Object.keys(stateData);
      const dataKey = keys.find((k) => k.includes("GetExperienceDetail"));
      
      if (dataKey && stateData[dataKey]?.data?.experience) {
        const expData = stateData[dataKey].data.experience;
        const packages = stateData[dataKey].data.experiencePackages || [];
        
        result.title = expData.name || result.title;
        result.description = stripHtml(expData.overview || expData.descSeo || expData.programIntroduction || "");
        result.excerpt = expData.shortDescription?.replace(/<[^>]*>/g, "").slice(0, 200) || result.description.slice(0, 200);
        result.highlights = (expData.highlights || []).map(h => stripHtml(h.description || h.name));
        result.duration = expData.duration || '';
        result.location = expData.locationName || 'Đà Nẵng';
        
        result.pricing.tiers = packages.map(pkg => {
          const adultPrice = pkg.minRate || pkg.publicRate || pkg.baseRate || 0;
          const childPrice = 0; // Will be merged from Playwright if available
          return {
            id: `price_${slugify(pkg.name || '').substring(0, 20)}`,
            name: pkg.name || '',
            description: stripHtml(pkg.description || ''),
            basePrice: adultPrice,
            childPrice: childPrice,
            currency: 'VND'
          };
        });
        
        if (result.pricing.tiers.length > 0) {
          result.pricing.basePrice = Math.min(...result.pricing.tiers.map(t => t.basePrice).filter(p => p > 0));
        }
      }
      
      // Extract gallery from clean JSON string
      const cdnUrls = clean.match(/https:\/\/cdn\d*\.ivivu\.com\/[^\s)"'<>]+\.(?:gif|jpg|jpeg|png|webp)/gi) || [];
      result.gallery = [...new Set(cdnUrls)].slice(0, 30);
      result.featuredImage = result.gallery[0] || '';
      
    } catch (e) {
      console.error("Failed to parse state JSON", e);
    }
  }
  
  // Merge child prices from Playwright extraction
  if (extractResult.childPrices && Object.keys(extractResult.childPrices).length > 0) {
    for (const [tierIndex, priceData] of Object.entries(extractResult.childPrices)) {
      const idx = parseInt(tierIndex);
      if (idx < result.pricing.tiers.length && priceData.childPrice) {
        result.pricing.tiers[idx].childPrice = priceData.childPrice;
      }
    }
  }
  
  // 4. Save result to temp file
  const tempFile = path.join(process.cwd(), '.temp', `scraped-activity-${slug}.json`);
  fs.mkdirSync(path.dirname(tempFile), { recursive: true });
  fs.writeFileSync(tempFile, JSON.stringify(result, null, 2));
  
  console.log(JSON.stringify({
    success: true,
    slug,
    data: result,
    tempFile
  }, null, 2));
}

run().catch(console.error);
