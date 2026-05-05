/**
 * Map scraped data to activities schema and save individual files.
 * Usage: node .temp/map-and-save.js
 */

const fs = require("fs");
const path = require("path");

// Find latest scraped file
const files = fs.readdirSync(".temp").filter(f => f.startsWith("scraped-activities-") && f.endsWith(".json"));
files.sort().reverse();
if (!files.length) {
  console.error("❌ No scraped data file found");
  process.exit(1);
}

const inputFile = `.temp/${files[0]}`;
console.log(`Reading: ${inputFile}`);

const raw = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
const { activities } = raw;

/**
 * Generate slug from title.
 * @param {string} title
 * @returns {string}
 */
function toSlug(title) {
  const map = {
    à: "a", á: "a", ả: "a", ã: "a", ạ: "a",
    â: "a", ầ: "a", ấ: "a", ẩ: "a", ẫ: "a", ậ: "a",
    è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e",
    ê: "e", ề: "e", ế: "e", ể: "e", ễ: "e", ệ: "e",
    ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
    ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o",
    ô: "o", ồ: "o", ố: "o", ổ: "o", ỗ: "o", ộ: "o",
    ơ: "o", ờ: "o", ớ: "o", ở: "o", ỡ: "o", ợ: "o",
    ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u",
    ư: "u", ừ: "u", ứ: "u", ử: "u", ữ: "u", ự: "u",
    ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y",
    đ: "d",
    Đ: "d",
  };
  const noAccent = title
    .toLowerCase()
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return noAccent;
}

/**
 * Map scraped detail to activities schema.
 * @param {object} item
 * @returns {object}
 */
function mapToSchema(item) {
  const d = item.detail;
  const slug = toSlug(d.title);

  // Build pricing object (keyed by price ID)
  const pricing = {};

  if (d.pricing && d.pricing.tiers && d.pricing.tiers.length > 0) {
    d.pricing.tiers.forEach((tier) => {
      pricing[tier.id] = {
        id: tier.id,
        name: tier.name,
        description: tier.description || "",
        basePrice: tier.adultPrice,
        childPrice: tier.childPrice || 0,
        currency: tier.currency || "VND",
        discountPercent: tier.discountPercent || 0,
        included: tier.included || [],
      };
    });
  } else {
    // Default pricing tier
    pricing.price_standard = {
      id: "price_standard",
      name: "Vé tiêu chuẩn",
      description: "Vé vào cửa tiêu chuẩn",
      basePrice: d.pricing?.adultPrice || d.pricing?.basePrice || 0,
      childPrice: d.pricing?.childPrice || 0,
      currency: d.pricing?.currency || "VND",
      discountPercent: 0,
      included: d.included || [],
    };
  }

  return {
    title: d.title,
    slug,
    duration: d.duration || "",
    durationDetail: d.durationDetail || "",
    location: d.location || "Phú Quốc",
    locationDetail: d.locationDetail || "",
    description: d.description || "",
    excerpt: d.excerpt || "",
    featuredImage: d.featuredImage || "",
    gallery: d.gallery || [],
    openingHours: d.openingHours || "",
    highlights: d.highlights || [],
    included: d.included || [],
    excluded: d.excluded || [],
    categories: d.categories || [],
    capacity: d.capacity || 0,
    recommendation: d.recommendation || "",
    childrenPolicy: d.childrenPolicy || "",
    cancellationPolicy: d.cancellationPolicy || "",
    notes: d.notes || [],
    purchaseGuide: d.purchaseGuide || [],
    ratingAverage: d.rating?.average || 0,
    ratingCount: d.rating?.count || 0,
    map: d.map || null,
    faq: d.faq || [],
    pricing,
    phone: d.phone || "",
    email: d.email || "",
    website: d.website || "",
    tags: d.tags || [],
    reviews: (d.reviews || []).slice(0, 10),
    _firecrawlCredits: 5,
    _source: item.listInfo.url,
  };
}

// Map all activities
const mapped = activities.map(mapToSchema);

// Save individual files
fs.mkdirSync(".temp", { recursive: true });
const savedFiles = [];

mapped.forEach((activity) => {
  const filePath = `.temp/scraped-activity-${activity.slug}.json`;
  fs.writeFileSync(filePath, JSON.stringify(activity, null, 2));
  savedFiles.push(filePath);
  console.log(`✅ Mapped: ${activity.title} → ${filePath}`);
});

// Save combined file
const combinedPath = `.temp/scraped-activities-mapped-${Date.now()}.json`;
fs.writeFileSync(combinedPath, JSON.stringify({ activities: mapped, count: mapped.length }, null, 2));
console.log(`\n✅ Combined file: ${combinedPath}`);
console.log(`\n=== Summary ===`);
console.log(`Total activities mapped: ${mapped.length}`);
console.log(`Files saved:`);
savedFiles.forEach((f) => console.log(`  - ${f}`));
