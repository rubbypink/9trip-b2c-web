/**
 * @fileoverview Simplified hotel scraper using Firecrawl Agent API
 * @module getHotelImages
 * @version 2.0.0
 */

import { fileURLToPath } from 'url';
import { initFirecrawl, scrapeWithAgent } from '../../../lib/firecrawl-agent.mjs';
import { HOTEL_AGENT_PROMPT, HOTEL_EXTRACT_SCHEMA, mapHotelToFirestore } from '../../../lib/schemas/hotel-schema.mjs';
import { searchForSiteUrl } from '../../../lib/websearch.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import { writeJsonToTemp, slugify } from '../../../lib/scrape-helpers.mjs';
import { normalizeImageUrl, deduplicateUrls } from '../../../lib/image-helpers.mjs';

/**
 * Scrape hotel data from booking.com URL using Firecrawl Agent
 * @param {string} url - Booking.com hotel URL
 * @returns {Promise<{success: boolean, data?: object, slug?: string, tempFile?: string, creditsUsed?: number, error?: string}>}
 */
export async function scrapeHotelFromUrl(url) {
  try {
    console.log(`\n🔍 Scraping hotel from: ${url}`);

    // Initialize Firecrawl
    const fc = initFirecrawl();

    // Scrape with agent
    console.log('   🤖 Starting Firecrawl Agent extraction...');
    const { data: rawData, creditsUsed } = await scrapeWithAgent(
      fc,
      url,
      HOTEL_AGENT_PROMPT,
      HOTEL_EXTRACT_SCHEMA,
      { maxCredits: 100 }
    );

    if (!rawData || !rawData.name) {
      throw new Error('Failed to extract hotel data: missing name');
    }

    console.log(`   ✅ Extracted: ${rawData.name} (${creditsUsed} credits)`);

    // Normalize and deduplicate gallery URLs
    if (rawData.gallery && Array.isArray(rawData.gallery)) {
      rawData.gallery = deduplicateUrls(
        rawData.gallery.map((u) => normalizeImageUrl(u, 1024))
      );
      console.log(`   🖼️  Gallery: ${rawData.gallery.length} images`);
    }

    // Normalize featured image
    if (rawData.featuredImage) {
      rawData.featuredImage = normalizeImageUrl(rawData.featuredImage, 1024);
    }

    // Map to Firestore schema
    const mappedData = mapHotelToFirestore(rawData);
    mappedData._firecrawlCredits = creditsUsed;

    // Generate slug
    const slug = mappedData.slug || slugify(mappedData.name);
    mappedData.slug = slug;

    // Sanitize data (replace competitor info with 9 Trip info)
    console.log('   🧹 Sanitizing data...');
    const { data: sanitizedData, warnings } = await sanitizeScrapedData(mappedData, {
      type: 'hotel',
      knownNames: [mappedData.name],
    });

    if (warnings.length > 0) {
      warnings.forEach((w) => console.warn(`   ⚠️  ${w}`));
    }

    // Save to temp file
    const tempFile = await writeJsonToTemp(sanitizedData, slug, 'booking-hotel');
    console.log(`   💾 Saved to: ${tempFile}`);

    return {
      success: true,
      data: sanitizedData,
      slug,
      tempFile,
      creditsUsed,
    };
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Search for hotel on booking.com and scrape
 * @param {string} hotelName - Hotel name to search
 * @returns {Promise<{success: boolean, data?: object, slug?: string, tempFile?: string, creditsUsed?: number, error?: string}>}
 */
export async function scrapeHotelByName(hotelName) {
  console.log(`\n🔎 Searching for: "${hotelName}" on booking.com...`);

  const url = await searchForSiteUrl('booking.com', hotelName);
  if (!url) {
    return {
      success: false,
      error: `Could not find "${hotelName}" on booking.com`,
    };
  }

  console.log(`   📍 Found URL: ${url}`);
  return scrapeHotelFromUrl(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  // Parse arguments
  const urlArg = args.find((a) => a.startsWith('--url='));
  const nameArg = args.find((a) => a.startsWith('--name='));
  const searchArg = args.find((a) => a.startsWith('--search='));

  let promise;

  if (urlArg) {
    const url = urlArg.split('=')[1];
    promise = scrapeHotelFromUrl(url);
  } else if (nameArg || searchArg) {
    const name = (nameArg || searchArg).split('=')[1];
    promise = scrapeHotelByName(name);
  } else {
    console.log(`
Usage:
  node getHotelImages.mjs --url=<booking-url>
  node getHotelImages.mjs --name=<hotel-name>
  node getHotelImages.mjs --search=<hotel-name>

Examples:
  node getHotelImages.mjs --url=https://www.booking.com/hotel/vn/lahana-resort-phu-quoc.html
  node getHotelImages.mjs --name="Lahana Resort Phú Quốc"
`);
    process.exit(0);
  }

  promise
    .then((result) => {
      if (result.success) {
        console.log('\n✨ Success!');
        console.log(`   Hotel: ${result.data.name}`);
        console.log(`   Slug: ${result.slug}`);
        console.log(`   Temp File: ${result.tempFile}`);
        console.log(`   Credits Used: ${result.creditsUsed}`);
        process.exit(0);
      } else {
        console.error('\n❌ Failed:', result.error);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('\n❌ Fatal Error:', err.message);
      process.exit(1);
    });
}

export default {
  scrapeHotelFromUrl,
  scrapeHotelByName,
};
