import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeSingleTour } from './tourScraper.mjs';
import { saveTourData } from './saveTourData.mjs';
import { nowISO } from '../../../lib/scrape-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.resolve(__dirname, '../../../../.temp');

const CONCURRENCY = 2;


function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function generateBatchReport(results, urls, startTime) {
  const reportDir = path.resolve(__dirname, '../../../../.report');
  fs.mkdirSync(reportDir, { recursive: true });

  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
  const filepath = path.join(reportDir, `batch-tours-${ts}.md`);

  const lines = [];
  lines.push(`# Batch Scrape Tour Report`);
  lines.push(`- **Thời gian chạy**: ${startTime} → ${nowISO()}`);
  lines.push(`- **Tổng URL**: ${urls.length}`);
  lines.push(`- **Thành công**: ${results.filter(r => r.success).length}`);
  lines.push(`- **Thất bại**: ${results.filter(r => !r.success).length}`);
  lines.push(`- **Concurrency**: ${CONCURRENCY}`);
  lines.push('');

  results.forEach((r, i) => {
    lines.push(`### ${i + 1}. ${r.success ? '✅' : '❌'} ${r.title || urls[i]}`);
    if (r.success) {
      lines.push(`- **Slug**: ${r.slug}`);
      lines.push(`- **Credits**: ${r.creditsUsed}`);
      lines.push(`- **Timeline**: ${r.timeline?.length || 0} phases`);
    } else {
      lines.push(`- **Lỗi**: ${r.error || 'Unknown error'}`);
    }
    lines.push('');
  });

  lines.push(`---\n*Report generated at ${nowISO()}*`);
  fs.writeFileSync(filepath, lines.join('\n'), 'utf-8');
  console.log(`\nBatch report: ${filepath}`);
  return filepath;
}

export async function batchScrapeTours(urls) {
  const startTime = nowISO();
  const results = [];

  console.log(`Batch scrape: ${urls.length} tours, concurrency=${CONCURRENCY}`);
  console.log('='.repeat(60));

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    console.log(`\nBatch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(urls.length / CONCURRENCY)}:`);

    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const scrapeResult = await scrapeSingleTour(url);
          if (!scrapeResult.success) {
            return { success: false, title: url, error: scrapeResult.error, timeline: scrapeResult.timeline };
          }
          const inputData = JSON.parse(fs.readFileSync(scrapeResult.tempFile, 'utf-8'));
          const saveResult = await saveTourData(inputData);
          return {
            success: saveResult.success,
            title: scrapeResult.data.title,
            slug: scrapeResult.slug,
            creditsUsed: scrapeResult.creditsUsed,
            tourId: saveResult.tourId,
            timeline: scrapeResult.timeline,
            error: saveResult.success ? null : (saveResult.errors?.[0] || 'Save failed'),
          };
        } catch (err) {
          return { success: false, title: url, error: err.message };
        }
      })
    );

    for (const r of batchResults) {
      results.push(r.status === 'fulfilled' ? r.value : { success: false, title: 'Unknown', error: r.reason?.message || 'Promise rejected' });
    }

    const ok = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log(`  → ${ok}/${batch.length} succeeded`);

    if (i + CONCURRENCY < urls.length) {
      await sleep(1000);
    }
  }

  console.log('\n' + '='.repeat(60));
  const reportPath = generateBatchReport(results, urls, startTime);

  console.log(`\nSummary: ${results.filter(r => r.success).length}/${urls.length} tours saved`);

  const tempResult = path.join(TEMP_DIR, `batch-result-${Date.now()}.json`);
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.writeFileSync(tempResult, JSON.stringify({ results, reportPath, startTime, endTime: nowISO() }, null, 2));
  console.log(`Results: ${tempResult}`);

  return { results, reportPath };
}

async function main() {
  let urls = [];

  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const m = arg.match(/^--(\w+)=(.+)$/);
    if (m) args[m[1]] = m[2];
  });

  if (args.urls) {
    urls = args.urls.split(',').map(u => u.trim()).filter(Boolean);
  } else if (args.file) {
    const raw = fs.readFileSync(args.file, 'utf-8');
    urls = JSON.parse(raw);
    if (!Array.isArray(urls)) {
      urls = urls.urls || urls.tours || Object.values(urls);
    }
  }

  if (urls.length === 0) {
    console.error('Usage:\n  node batchScrapeTours.mjs --urls=https://url1,https://url2\n  node batchScrapeTours.mjs --file=tours.json');
    process.exit(1);
  }

  urls = urls.map(u => typeof u === 'string' ? u : u.url || u.link || u.href).filter(Boolean);

  const result = await batchScrapeTours(urls);
  if (result.results.some(r => !r.success)) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
