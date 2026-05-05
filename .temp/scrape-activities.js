/**
 * Scrape activities from rootytrip.com using FireCrawl API directly.
 * Usage: node .temp/scrape-activities.js
 */

const FIRECRAWL_API_KEY = "fc-470efea2a9994fa79abe423d28ea2956";
const FIRECRAWL_API = "https://api.firecrawl.dev/v1";
const LIST_URL = "https://rootytrip.com/ve-tham-quan/";

/**
 * Call FireCrawl API.
 * @param {string} endpoint - API endpoint path (e.g., /scrape, /crawl)
 * @param {object} body - Request body
 * @returns {Promise<object>}
 */
async function callFireCrawl(endpoint, body) {
  const url = `${FIRECRAWL_API}${endpoint}`;
  console.log(`[API] POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FireCrawl API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Step 1: Scrape list page to get all activity URLs.
 */
async function scrapeListPage() {
  console.log("\n=== Giai đoạn B1: Scrape list page ===");
  console.log(`URL: ${LIST_URL}`);

  const result = await callFireCrawl("/scrape", {
    url: LIST_URL,
    formats: ["json"],
    jsonOptions: {
      prompt: `Extract all activity/tour listings from this page. For each activity, provide the title and the full absolute URL to the detail page.`,
      schema: {
        type: "object",
        properties: {
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string", description: "Full absolute URL to the activity detail page" },
                price: { type: "number" },
                duration: { type: "string" },
                image: { type: "string" },
                category: { type: "string" },
              },
              required: ["title", "url"],
            },
          },
        },
        required: ["activities"],
      },
    },
    waitFor: 3000,
  });

  console.log("List page result:", JSON.stringify(result, null, 2));
  return result;
}

/**
 * Step 2: Scrape a single activity detail page.
 * @param {string} url - Activity detail URL
 * @param {number} index - Activity index
 */
async function scrapeActivityDetail(url, index) {
  console.log(`\n--- Scraping activity #${index}: ${url} ---`);

  const result = await callFireCrawl("/scrape", {
    url,
    formats: ["json"],
    jsonOptions: {
      prompt: `Role: You are a 9Trip B2C activity/tourist attraction data extraction specialist. Extract structured data from this activity page.

Extract the following from the page:
1. Activity title (exact name, trim whitespace)
2. Duration (e.g. "1/2 ngày", "1 ngày", "Khoảng 20 phút")
3. Location (city/region name where the activity takes place)
4. Location detail/address (specific address if available)
5. Description (full activity description, can include basic HTML)
6. Short excerpt (first 150 chars of description, plain text only)
7. Main/featured image URL (the primary photo, full absolute URL)
8. Gallery image URLs (ALL available photos, full absolute URLs, deduplicated)
9. Opening hours / schedule (when the activity takes place)
10. Highlights (top features or unique selling points)
11. What's included (tickets, meals, transfers, guide, etc.)
12. What's excluded
13. Categories (activity type tags)
14. Capacity (maximum number of participants, if shown)
15. Recommendation / tips (important advice for visitors)
16. Children policy (if shown)
17. Cancellation policy (if shown)
18. Important notes/warnings
19. Purchase guide (step-by-step instructions for buying tickets if available)
20. Guest rating: average score (number 1-10) and review count
21. Map coordinates (latitude, longitude) if available
22. FAQ items: question + answer pairs (if available)
23. Pricing: Extract ALL pricing tiers/package options. Return as an object containing basePrice (lowest adult price), adultPrice, childPrice, currency, and a tiers array.
24. Recent reviews (max 10): reviewerName, reviewerAvatar, rating (1-10), text, date, country

Return ONLY a JSON object matching the schema below. No extra text, no markdown.`,
      schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Activity title (required)" },
          duration: { type: "string", description: "Duration e.g. '1/2 ngày', '1 ngày'" },
          durationDetail: { type: "string", description: "Detailed duration" },
          location: { type: "string", description: "City/region" },
          locationDetail: { type: "string", description: "Specific address" },
          description: { type: "string", description: "Full activity description" },
          excerpt: { type: "string", description: "Short description, max 200 chars" },
          featuredImage: { type: "string", description: "Main photo URL" },
          gallery: { type: "array", items: { type: "string" }, description: "All activity photo URLs" },
          openingHours: { type: "string", description: "Opening hours / show times" },
          highlights: { type: "array", items: { type: "string" }, description: "Top features" },
          included: { type: "array", items: { type: "string" }, description: "What's included" },
          excluded: { type: "array", items: { type: "string" }, description: "What's excluded" },
          categories: { type: "array", items: { type: "string" }, description: "Activity categories" },
          capacity: { type: "number", description: "Maximum participants" },
          recommendation: { type: "string", description: "Tips and recommendations" },
          childrenPolicy: { type: "string", description: "Children policy" },
          cancellationPolicy: { type: "string", description: "Cancellation policy" },
          notes: { type: "array", items: { type: "string" }, description: "Important notes" },
          purchaseGuide: { type: "array", items: { type: "string" }, description: "Step-by-step purchase guide" },
          rating: {
            type: "object",
            properties: {
              average: { type: "number", description: "Average guest rating (1-10)" },
              count: { type: "number", description: "Number of reviews" },
            },
          },
          map: {
            type: "object",
            properties: {
              lat: { type: "number" },
              lng: { type: "number" },
            },
          },
          faq: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" },
              },
            },
          },
          pricing: {
            type: "object",
            properties: {
              basePrice: { type: "number", description: "Lowest adult price (VND)" },
              adultPrice: { type: "number", description: "Default adult price (VND)" },
              childPrice: { type: "number", description: "Default child price (VND)" },
              currency: { type: "string", description: "Currency code e.g. VND" },
              tiers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Price ID" },
                    name: { type: "string", description: "Package/tier name" },
                    description: { type: "string" },
                    adultPrice: { type: "number" },
                    childPrice: { type: "number" },
                    currency: { type: "string" },
                    discountPercent: { type: "number" },
                    included: { type: "array", items: { type: "string" } },
                  },
                  required: ["id", "name", "adultPrice"],
                },
              },
            },
            required: ["basePrice", "tiers"],
          },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          reviews: {
            type: "array",
            items: {
              type: "object",
              properties: {
                reviewerName: { type: "string" },
                reviewerAvatar: { type: "string" },
                rating: { type: "number", description: "Rating 1-10" },
                text: { type: "string" },
                date: { type: "string" },
                country: { type: "string" },
              },
            },
          },
        },
        required: ["title"],
      },
    },
    waitFor: 3000,
  });

  return result;
}

/**
 * Main execution.
 */
async function main() {
  console.log("=== Activity Scraper — rootytrip.com ===");
  console.log(`Started at: ${new Date().toISOString()}`);

  // Step 1: Scrape list page
  const listResult = await scrapeListPage();
  const activities = listResult?.data?.json?.activities || [];

  if (!activities.length) {
    console.log("\n❌ No activities found in list page.");
    console.log("Raw response:", JSON.stringify(listResult, null, 2));
    process.exit(1);
  }

  console.log(`\n✅ Found ${activities.length} activities:`);
  activities.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.title} — ${a.url}`);
  });

  // Step 2: Scrape first 3 activity details
  const MAX_ACTIVITIES = 3;
  const toScrape = activities.slice(0, MAX_ACTIVITIES);
  const scrapedData = [];

  for (let i = 0; i < toScrape.length; i++) {
    const activity = toScrape[i];
    try {
      const detail = await scrapeActivityDetail(activity.url, i + 1);
      scrapedData.push({
        listInfo: activity,
        detail: detail?.data?.json || detail?.data || {},
        scrapeId: detail?.data?.metadata?.id || null,
      });
      console.log(`✅ Activity #${i + 1} "${activity.title}" scraped successfully`);
    } catch (err) {
      console.error(`❌ Activity #${i + 1} "${activity.title}" failed:`, err.message);
    }
  }

  // Step 3: Save results
  const fs = require("fs");
  const outputPath = `.temp/scraped-activities-${Date.now()}.json`;
  fs.mkdirSync(".temp", { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ activities: scrapedData, listPage: LIST_URL, scrapedAt: new Date().toISOString() }, null, 2));
  console.log(`\n✅ Saved to ${outputPath}`);
  console.log(`\n=== Summary ===`);
  console.log(`Total activities found: ${activities.length}`);
  console.log(`Successfully scraped: ${scrapedData.length}`);
  console.log(`Failed: ${toScrape.length - scrapedData.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
