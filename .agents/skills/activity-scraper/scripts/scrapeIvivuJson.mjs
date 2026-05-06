import https from 'https';
import fs from 'fs';
import path from 'path';
import { slugify } from '../../../lib/scrape-helpers.mjs';

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function unescapeHtml(str) {
  return str
    .replace(/&q;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&a;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&l;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&g;/g, '>')
    .replace(/&#39;/g, "'");
}

function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '') : '';
}

async function run() {
  const url = 'https://www.ivivu.com/ve-vui-choi/hoat-dong/ve-sun-world-ba-na-hills/21619';
  const html = await fetchHtml(url);
  
  const scriptTag = '<script id="appid01-state" type="application/json">';
  const sIdx = html.indexOf(scriptTag);
  const eIdx = html.indexOf("</script>", sIdx);
  
  if (sIdx === -1) {
    console.error("Could not find state JSON");
    return;
  }
  
  const raw = html.substring(sIdx + scriptTag.length, eIdx);
  const clean = unescapeHtml(raw);
  const stateData = JSON.parse(clean);
  
  const keys = Object.keys(stateData);
  const dataKey = keys.find((k) => k.includes("GetExperienceDetail"));
  
  if (!dataKey || !stateData[dataKey]?.data?.experience) {
    console.error("Could not find experience data");
    return;
  }
  
  const expData = stateData[dataKey].data.experience;
  const packages = stateData[dataKey].data.experiencePackages || [];
  
  const title = expData.name || '';
  const slug = url.split('/').slice(-2, -1)[0] || slugify(title);
  
  const description = expData.overview || expData.descSeo || expData.programIntroduction || "";
  const excerpt = expData.shortDescription?.replace(/<[^>]*>/g, "").slice(0, 200) || stripHtml(description).slice(0, 200);
  
  const gallery = (expData.images || []).map(img => img.url).filter(Boolean);
  const featuredImage = gallery[0] || '';
  
  const highlights = (expData.highlights || []).map(h => stripHtml(h.description || h.name));
  
  const pricingTiers = packages.map(pkg => {
    const adultPrice = pkg.priceAdult || pkg.price || 0;
    const childPrice = pkg.priceChild || 0;
    return {
      id: `price_${slugify(pkg.name || '').substring(0, 20)}`,
      name: pkg.name || '',
      description: stripHtml(pkg.description || ''),
      basePrice: adultPrice,
      childPrice: childPrice,
      currency: 'VND'
    };
  });
  
  const basePrice = pricingTiers.length > 0 ? Math.min(...pricingTiers.map(t => t.basePrice).filter(p => p > 0)) : 0;
  
  const result = {
    slug,
    title,
    excerpt,
    description: stripHtml(description),
    featuredImage,
    gallery,
    duration: expData.duration || '',
    location: expData.locationName || 'Đà Nẵng',
    highlights,
    pricing: {
      basePrice,
      currency: 'VND',
      tiers: pricingTiers
    },
    _sourceUrl: url
  };
  
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
