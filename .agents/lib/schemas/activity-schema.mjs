/**
 * @fileoverview Activity Schema Module — Defines extraction schemas, agent prompts, and Firestore mapping for activities.
 * @module activity-schema
 * @version 4.0.0
 */

import { schemaToExtractSchema, schemaToListExtractSchema } from '../schema-utils.mjs';

// ============================================================================
// ACTIVITY SCHEMA METADATA
// ============================================================================

/**
 * Activity schema metadata definitions per activities.schema.md v4.0.0
 * @constant {Object<string, {type: string, required?: boolean, description: string}>}
 */
export const ACTIVITY_SCHEMA = {
	// Core fields
	slug: { type: 'string', required: true, description: 'URL slug (unique)' },
	title: { type: 'string', required: true, description: 'Activity name/title (required)' },

	// Content
	excerpt: { type: 'string', description: 'Short description' },
	description: { type: 'string', description: 'Full description (HTML)' },
	featuredImage: { type: 'string', description: 'Main photo URL' },
	gallery: { type: 'array', items: { type: 'string' }, description: 'Gallery image URLs' },

	// Duration & Location
	duration: { type: 'string', description: 'Duration e.g. 1/2 ngày, 1 ngày' },
	durationDetail: { type: 'string', description: 'Detailed duration e.g. Khoảng 20 phút' },
	location: { type: 'string', description: 'City/region name' },
	locationId: { type: 'string', description: 'Reference to locations collection' },
	locationDetail: { type: 'string', description: 'Specific address' },

	// Schedule
	openingHours: { type: 'string', description: 'Opening hours / show times' },
	capacity: { type: 'number', description: 'Maximum participants' },

	// Features
	highlights: { type: 'array', items: { type: 'string' }, description: 'Top features' },
	included: { type: 'array', items: { type: 'string' }, description: 'What is included' },
	excluded: { type: 'array', items: { type: 'string' }, description: 'What is excluded' },
	categories: { type: 'array', items: { type: 'string' }, description: 'Activity categories' },
	tags: { type: 'array', items: { type: 'string' }, description: 'Tags/keywords' },

	// Pricing (with embedded tiers v4)
	pricing: {
		type: 'object',
		description: 'Pricing object with basePrice and tiers array',
		properties: {
			basePrice: { type: 'number', description: 'Lowest adult price for filter/sort (VND)' },
			adultPrice: { type: 'number', description: 'Default adult price (VND)' },
			childPrice: { type: 'number', description: 'Default child price (VND)' },
			currency: { type: 'string', description: 'Currency code (default: VND)' },
			tiers: {
				type: 'array',
				description: 'Pricing tiers array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string', description: 'Price ID (unique within activity)' },
						name: { type: 'string', description: 'Package/tier name' },
						description: { type: 'string', description: 'Tier description' },
						adultPrice: { type: 'number', description: 'Adult price (VND)' },
						childPrice: { type: 'number', description: 'Child price (VND, 0 if free)' },
						currency: { type: 'string', description: 'Currency code' },
						discountPercent: { type: 'number', description: 'Discount percent 0-100' },
						included: { type: 'array', items: { type: 'string' }, description: 'Included items' },
					},
				},
			},
		},
	},

	// Policies
	childrenPolicy: { type: 'string', description: 'Children policy' },
	cancellationPolicy: { type: 'string', description: 'Cancellation policy' },
	recommendation: { type: 'string', description: 'Tips and recommendations' },
	notes: { type: 'array', items: { type: 'string' }, description: 'Important notes' },

	// Guide
	purchaseGuide: { type: 'array', items: { type: 'string' }, description: 'Step-by-step purchase guide' },

	// FAQ
	faq: {
		type: 'array',
		description: 'FAQ items',
		items: {
			type: 'object',
			properties: {
				question: { type: 'string' },
				answer: { type: 'string' },
			},
		},
	},

	// Ratings
	ratingAverage: { type: 'number', description: 'Average rating 1-10' },
	ratingCount: { type: 'number', description: 'Number of reviews' },

	// Map
	map: {
		type: 'object',
		description: 'Map coordinates',
		properties: {
			lat: { type: 'number' },
			lng: { type: 'number' },
			zoom: { type: 'number' },
		},
	},

	// Contact
	phone: { type: 'string', description: 'Phone number' },
	email: { type: 'string', description: 'Email address' },
	website: { type: 'string', description: 'Website URL' },

	// Reviews (embedded map)
	reviews: {
		type: 'map',
		description: 'Embedded reviews map',
		items: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				reviewerName: { type: 'string' },
				reviewerAvatar: { type: 'string' },
				rating: { type: 'number' },
				text: { type: 'string' },
				date: { type: 'string' },
				country: { type: 'string' },
				sortOrder: { type: 'number' },
			},
		},
	},

	// Meta
	isFeatured: { type: 'boolean', description: 'Featured activity flag' },
	status: { type: 'string', description: 'Status: active/inactive' },
	metaTitle: { type: 'string', description: 'SEO title' },
	metaDescription: { type: 'string', description: 'SEO description' },
	createdAt: { type: 'timestamp', required: true, description: 'Creation timestamp' },
	updatedAt: { type: 'timestamp', required: true, description: 'Last update timestamp' },
};

/**
 * Required activity fields for validation
 * @constant {string[]}
 */
export const ACTIVITY_REQUIRED_FIELDS = ['slug', 'title'];

// ============================================================================
// FIRECRAWL EXTRACTION SCHEMA
// ============================================================================

/**
 * JSON Schema for Firecrawl activity extraction
 * Generated from ACTIVITY_SCHEMA
 * @constant {Object}
 */
export const ACTIVITY_EXTRACT_SCHEMA = {
	...schemaToExtractSchema(ACTIVITY_SCHEMA),
	required: ['title'],
};

/**
 * Schema metadata for list page items
 * @constant {Object}
 */
const ACTIVITY_LIST_ITEM_SCHEMA = {
	title: { type: 'string', description: 'Activity name' },
	url: { type: 'string', description: 'Full absolute URL to activity detail page' },
	price: { type: 'number', description: 'Starting price' },
	duration: { type: 'string', description: 'Activity duration' },
	image: { type: 'string', description: 'Thumbnail URL' },
	category: { type: 'string', description: 'Activity category' },
};

/**
 * JSON Schema for Firecrawl activity list page extraction
 * Generated from ACTIVITY_LIST_ITEM_SCHEMA
 * @constant {Object}
 */
export const ACTIVITY_LIST_EXTRACT_SCHEMA = schemaToListExtractSchema(
	ACTIVITY_LIST_ITEM_SCHEMA,
	'activities',
	{ requiredFields: ['title', 'url'] }
);

// ============================================================================
// AGENT PROMPT
// ============================================================================

/**
 * Agent prompt for Firecrawl activity extraction
 * @constant {string}
 */
export const ACTIVITY_AGENT_PROMPT = `Role: You are a 9Trip B2C activity/tourist attraction data extraction specialist. Extract structured data from this activity page.

Context: The 9Trip platform manages activity data in Firestore with a strict schema. Every field must conform.

Instructions:
1. Extract activity data from the page
2. Click on gallery lightbox/popup to load ALL available photos at max1024x768 resolution
3. Expand FAQ accordions to get all Q&A pairs
4. Look for opening hours, purchase guide, and important information sections
5. Get up to 10 recent reviews

Extract the following:
1. Activity title (exact name, trim whitespace)
2. Duration (e.g. "1/2 ngày", "1 ngày", "Khoảng 20 phút")
3. Location (city/region name where activity takes place)
4. Location detail/address (specific address if available)
5. Description (full activity description, can include basic HTML)
6. Short excerpt (first 150 chars of description, plain text only)
7. Main/featured image URL (the primary photo, full absolute URL)
8. Gallery image URLs (ALL available photos, full absolute URLs, deduplicated)
9. Opening hours / schedule (when activity takes place, e.g. "19:50 hằng ngày")
10. Highlights (top features or unique selling points)
11. What's included (tickets, meals, transfers, guide, etc.)
12. What's excluded
13. Categories (activity type tags)
14. Capacity (maximum number of participants, if shown)
15. Recommendation / tips (important advice for visitors)
16. Children policy (if shown)
17. Cancellation policy (if shown)
18. Important notes/warnings
19. Purchase guide (step-by-step instructions for buying tickets)
20. Guest rating: average score (number 1-10) and review count
21. Map coordinates (latitude, longitude) if available
22. FAQ items: question + answer pairs (expand ALL accordions)
23. Pricing (Tiers list): Extract ALL pricing tiers/package options. Return as object containing:
    - basePrice (lowest adult price across all tiers, VND)
    - adultPrice (default adult price, VND)
    - childPrice (default child price, VND, 0 if free)
    - currency (default "VND")
    - tiers array where each item has:
      * id (string, unique key)
      * name (string, package/tier name)
      * description (string, optional)
      * adultPrice (number, adult price in VND)
      * childPrice (number, 0 if free)
      * currency (string, default "VND")
      * discountPercent (number, 0-100)
      * included (array of strings, optional)
24. Recent reviews (max 10): for each review extract:
    - reviewerName
    - reviewerAvatar URL (if available)
    - rating (number 1-10)
    - text (full review text)
    - date (review date)
    - country (reviewer country)

Return ONLY a JSON object matching the schema. No extra text, no markdown.`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Vietnamese diacritics map for slug generation
 * @constant {Object<string, string>}
 */
const VIETNAMESE_DIACRITICS_MAP = {
	à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
	ă: 'a', ằ: 'a', ắ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
	â: 'a', ầ: 'a', ấ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
	đ: 'd',
	è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
	ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
	ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
	ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
	ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
	ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
	ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
	ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
	y: 'y', ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
	À: 'A', Á: 'A', Ả: 'A', Ã: 'A', Ạ: 'A',
	Ă: 'A', Ằ: 'A', Ắ: 'A', Ẳ: 'A', Ẵ: 'A', Ặ: 'A',
	Â: 'A', Ầ: 'A', Ấ: 'A', Ẩ: 'A', Ẫ: 'A', Ậ: 'A',
	Đ: 'D',
	È: 'E', É: 'E', Ẻ: 'E', Ẽ: 'E', Ẹ: 'E',
	Ê: 'E', Ề: 'E', Ế: 'E', Ể: 'E', Ễ: 'E', Ệ: 'E',
	Ì: 'I', Í: 'I', Ỉ: 'I', Ĩ: 'I', Ị: 'I',
	Ò: 'O', Ó: 'O', Ỏ: 'O', Õ: 'O', Ọ: 'O',
	Ô: 'O', Ồ: 'O', Ố: 'O', Ổ: 'O', Ỗ: 'O', Ộ: 'O',
	Ơ: 'O', Ờ: 'O', Ớ: 'O', Ở: 'O', Ỡ: 'O', Ợ: 'O',
	Ù: 'U', Ú: 'U', Ủ: 'U', Ũ: 'U', Ụ: 'U',
	Ư: 'U', Ừ: 'U', Ứ: 'U', Ử: 'U', Ữ: 'U', Ự: 'U',
	Y: 'Y', Ỳ: 'Y', Ý: 'Y', Ỷ: 'Y', Ỹ: 'Y', Ỵ: 'Y',
};

/**
 * Generate URL-friendly slug from text with Vietnamese diacritics support
 * @param {string} text - Input text
 * @returns {string} URL-friendly slug
 */
export function generateSlug(text) {
	if (!text || typeof text !== 'string') return '';

	return text
		.toString()
		.trim()
		.split('')
		.map((char) => VIETNAMESE_DIACRITICS_MAP[char] || char)
		.join('')
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Generate review key from reviewer name and date
 * @param {Object} review - Review object
 * @param {number} index - Review index
 * @returns {string} Review key
 */
function generateReviewKey(review, index) {
	const nameSlug = generateSlug(review.reviewerName || 'anonymous');
	const dateSlug = generateSlug(review.date || '');
	return `review_${nameSlug}${dateSlug ? '-' + dateSlug : ''}-${index}`;
}

// ============================================================================
// FIRESTORE MAPPING
// ============================================================================

/**
 * Map raw scraped activity data to Firestore document structure per activities.schema.md v4.0.0
 * @param {Object} rawData - Raw scraped data from Firecrawl
 * @returns {Object} Firestore-ready document object
 */
export function MAP_TO_FIRESTORE(rawData) {
	if (!rawData || typeof rawData !== 'object') {
		throw new Error('Invalid raw data: expected object');
	}

	// Generate slug from title (activities use title, not name)
	const slug = rawData.slug || generateSlug(rawData.title);

	// Extract gallery URLs and normalize
	const gallery = (rawData.gallery || [])
		.map((url) => (typeof url === 'string' ? url.replace(/\/max\d+(?:x\d+)?\//i, '/max1024x768/') : ''))
		.filter(Boolean);

	// Map reviews to embedded Map object
	const reviewsMap = {};
	(rawData.reviews || []).slice(0, 10).forEach((review, index) => {
		const key = generateReviewKey(review, index);
		reviewsMap[key] = {
			id: key,
			reviewerName: review.reviewerName || '',
			reviewerAvatar: review.reviewerAvatar || '',
			rating: review.rating || 0,
			text: review.text || '',
			date: review.date || '',
			country: review.country || '',
			sortOrder: index + 1,
		};
	});

	// Build tags from categories, location, highlights
	const tags = Array.isArray(rawData.tags) ? [...rawData.tags] : [];
	if (rawData.location) tags.push(rawData.location);
	if (rawData.categories) tags.push(...rawData.categories);
	if (rawData.highlights) {
		rawData.highlights.forEach((h) => {
			if (typeof h === 'string' && h.length < 20) tags.push(h);
		});
	}

	// Map pricing with embedded tiers
	let pricing = {
		basePrice: null,
		adultPrice: null,
		childPrice: null,
		currency: 'VND',
		tiers: [],
	};

	if (rawData.pricing) {
		const tiers = (rawData.pricing.tiers || []).map((tier, index) => ({
			id: tier.id || `price_${slug}_${index}`,
			name: tier.name || 'Standard',
			description: tier.description || '',
			adultPrice: tier.adultPrice || 0,
			childPrice: tier.childPrice ?? null,
			currency: tier.currency || 'VND',
			discountPercent: tier.discountPercent || 0,
			included: Array.isArray(tier.included) ? tier.included : [],
		}));

		// Calculate basePrice as lowest adult price
		const adultPrices = tiers.map((t) => t.adultPrice).filter((p) => p > 0);
		const basePrice = adultPrices.length > 0 ? Math.min(...adultPrices) : rawData.pricing.basePrice || 0;

		pricing = {
			basePrice,
			adultPrice: rawData.pricing.adultPrice || basePrice,
			childPrice: rawData.pricing.childPrice ?? null,
			currency: rawData.pricing.currency || 'VND',
			tiers,
		};
	}

	// Build activity document
	const doc = {
		// Core
		slug,
		title: rawData.title || '',

		// Content
		excerpt: rawData.excerpt || rawData.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
		description: rawData.description || '',
		featuredImage: rawData.featuredImage || gallery[0] || '',
		gallery: [...new Set(gallery)].slice(0, 30),

		// Duration & Location
		duration: rawData.duration || '',
		durationDetail: rawData.durationDetail || '',
		location: rawData.location || '',
		locationDetail: rawData.locationDetail || '',

		// Schedule
		openingHours: rawData.openingHours || '',
		capacity: rawData.capacity || null,

		// Features
		highlights: Array.isArray(rawData.highlights) ? rawData.highlights : [],
		included: Array.isArray(rawData.included) ? rawData.included : [],
		excluded: Array.isArray(rawData.excluded) ? rawData.excluded : [],
		categories: Array.isArray(rawData.categories) ? rawData.categories : [],
		tags: [...new Set(tags)],

		// Pricing with embedded tiers
		pricing,

		// Policies
		childrenPolicy: rawData.childrenPolicy || '',
		cancellationPolicy: rawData.cancellationPolicy || '',
		recommendation: rawData.recommendation || '',
		notes: Array.isArray(rawData.notes) ? rawData.notes : [],

		// Guide
		purchaseGuide: Array.isArray(rawData.purchaseGuide) ? rawData.purchaseGuide : [],

		// FAQ
		faq: Array.isArray(rawData.faq) ? rawData.faq : [],

		// Ratings
		ratingAverage: rawData.rating?.average || rawData.ratingAverage || 0,
		ratingCount: rawData.rating?.count || rawData.ratingCount || 0,

		// Map
		map: rawData.map || null,

		// Contact
		phone: rawData.phone || '',
		email: rawData.email || '',
		website: rawData.website || '',

		// Reviews
		reviews: reviewsMap,

		// Meta
		isFeatured: rawData.isFeatured || false,
		status: rawData.status || 'active',

		// Timestamps
		createdAt: rawData.createdAt || new Date().toISOString(),
		updatedAt: rawData.updatedAt || new Date().toISOString(),

		// Internal tracking
		_firecrawlCredits: rawData._firecrawlCredits || 0,
	};

	return doc;
}

// Alias export for convenience
export { MAP_TO_FIRESTORE as mapActivityToFirestore };

// Default export
export default {
	ACTIVITY_SCHEMA,
	ACTIVITY_REQUIRED_FIELDS,
	ACTIVITY_EXTRACT_SCHEMA,
	ACTIVITY_LIST_EXTRACT_SCHEMA,
	ACTIVITY_AGENT_PROMPT,
	MAP_TO_FIRESTORE,
	mapActivityToFirestore: MAP_TO_FIRESTORE,
	generateSlug,
};
