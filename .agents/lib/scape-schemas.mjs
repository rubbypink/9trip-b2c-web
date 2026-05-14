/**
 * @fileoverview Consolidated Schema Module — All schema definitions (hotel, tour, activity, blog) in one place.
 * Replaces individual files in .agents/lib/schemas/ and packages/shared/schemas/.
 * @module scape-schemas
 * @version 1.0.0
 */

import { schemaToExtractSchema, schemaToListExtractSchema } from './schema-utils.mjs';

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Vietnamese diacritics map for slug generation
 * @constant {Object<string, string>}
 */
const VIETNAMESE_DIACRITICS_MAP = {
	// Lowercase
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
	// Uppercase
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
// HOTEL SCHEMA
// ============================================================================

/**
 * Hotel schema metadata definitions per hotels.schema.md v4.0.0
 * @constant {Object<string, {type: string, required?: boolean, description: string}>}
 */
export const HOTEL_SCHEMA = {
	// Core fields
	name: { type: 'string', required: true, description: 'Hotel name (required)' },
	slug: { type: 'string', required: true, description: 'URL slug (unique)' },
	starRating: { type: 'number', description: 'Star rating 1-5' },

	// Address
	address: {
		type: 'object',
		description: 'Address object',
		properties: {
			street: { type: 'string', description: 'Street address' },
			city: { type: 'string', description: 'City name' },
			cityId: { type: 'string', description: 'Reference to locations collection' },
			country: { type: 'string', description: 'Country name' },
		},
	},

	// Pricing (basic info only - detailed pricing in hotel_price_schedules)
	pricing: {
		type: 'object',
		description: 'Basic pricing info',
		properties: {
			basePrice: { type: 'number', description: 'Base price in VND' },
			currency: { type: 'string', description: 'Currency code (default: VND)' },
		},
	},

	// Content
	description: { type: 'string', description: 'Full hotel description (HTML)' },
	excerpt: { type: 'string', description: 'Short description, max 200 chars' },
	featuredImage: { type: 'string', description: 'Main photo URL' },
	gallery: { type: 'array', items: { type: 'string' }, description: 'All hotel photo URLs' },

	// Features
	amenities: { type: 'array', items: { type: 'string' }, description: 'Hotel facilities' },
	highlights: { type: 'array', items: { type: 'string' }, description: 'Top features' },
	tags: { type: 'array', items: { type: 'string' }, description: 'Tags like resort, sea-view, pool' },

	// Ratings
	rating: {
		type: 'object',
		description: 'Guest rating info',
		properties: {
			average: { type: 'number', description: 'Average guest rating 1-10' },
			count: { type: 'number', description: 'Number of reviews' },
		},
	},

	// Policies
	policies: {
		type: 'object',
		description: 'Hotel policies',
		properties: {
			checkIn: { type: 'string', description: 'Check-in time e.g. 14:00' },
			checkOut: { type: 'string', description: 'Check-out time e.g. 12:00' },
			cancellation: { type: 'string', description: 'Cancellation policy (HTML)' },
			children: { type: 'string', description: 'Children policy (HTML)' },
			pets: { type: 'string', description: 'Pets policy (HTML)' },
			taxes: { type: 'string', description: 'Taxes & fees (HTML)' },
			notes: { type: 'string', description: 'Additional notes (HTML)' },
		},
	},

	// Map
	map: {
		type: 'object',
		description: 'Map coordinates',
		properties: {
			lat: { type: 'number', description: 'Latitude' },
			lng: { type: 'number', description: 'Longitude' },
			zoom: { type: 'number', description: 'Zoom level' },
		},
	},

	// Contact
	phone: { type: 'string', description: 'Phone number' },
	email: { type: 'string', description: 'Email address' },
	website: { type: 'string', description: 'Website URL' },

	// Rooms (embedded array v4)
	rooms: {
		type: 'array',
		description: 'Embedded array of room objects',
		items: { ref: 'HOTEL_ROOM_SCHEMA' },
	},

	// Meta
	isFeatured: { type: 'boolean', description: 'Featured hotel flag' },
	createdAt: { type: 'timestamp', required: true, description: 'Creation timestamp' },
	updatedAt: { type: 'timestamp', required: true, description: 'Last update timestamp' },
};

/**
 * Required hotel fields for validation
 * @constant {string[]}
 */
export const HOTEL_REQUIRED_FIELDS = ['name', 'slug'];

// ============================================================================
// ROOM SCHEMA
// ============================================================================

/**
 * Room object schema for embedded rooms array
 * @constant {Object}
 */
export const HOTEL_ROOM_SCHEMA = {
	type: 'object',
	properties: {
		id: { type: 'string', description: 'Room ID (unique within hotel)' },
		name: { type: 'string', description: 'Room type name (required)' },
		slug: { type: 'string', description: 'URL slug (unique within hotel)' },
		description: { type: 'string', description: 'Room description (HTML)' },
		featuredImage: { type: 'string', description: 'Room featured image URL' },
		gallery: { type: 'array', items: { type: 'string' }, description: 'Room gallery URLs' },
		bedType: { type: 'string', description: 'Bed type e.g. 1 giường King' },
		maxAdults: { type: 'number', description: 'Maximum adults' },
		maxChildren: { type: 'number', description: 'Maximum children' },
		maxGuests: { type: 'number', description: 'Total maximum guests' },
		roomSize: { type: 'number', description: 'Room size in m²' },
		amenities: { type: 'array', items: { type: 'string' }, description: 'Room amenities' },
		included: { type: 'array', items: { type: 'string' }, description: 'Included items' },
		totalRooms: { type: 'number', description: 'Total physical rooms of this type' },
		isActive: { type: 'boolean', description: 'Active status' },
		sortOrder: { type: 'number', description: 'Display order' },
	},
	required: ['name'],
};

// ============================================================================
// REVIEW SCHEMA
// ============================================================================

/**
 * Review object schema for embedded reviews map
 * @constant {Object}
 */
export const HOTEL_REVIEW_SCHEMA = {
	type: 'object',
	properties: {
		reviewerName: { type: 'string', description: 'Reviewer name' },
		reviewerAvatar: { type: 'string', description: 'Avatar URL' },
		rating: { type: 'number', description: 'Rating 1-10' },
		text: { type: 'string', description: 'Review text' },
		date: { type: 'string', description: 'Review date' },
		country: { type: 'string', description: 'Reviewer country' },
		sortOrder: { type: 'number', description: 'Display order' },
	},
};

// ============================================================================
// FIRECRAWL EXTRACTION SCHEMA
// ============================================================================

/**
 * JSON Schema for Firecrawl hotel extraction
 * Generated from HOTEL_SCHEMA with sub-schema references
 * @constant {Object}
 */
export const HOTEL_EXTRACT_SCHEMA = {
	...schemaToExtractSchema(HOTEL_SCHEMA),
	properties: {
		...schemaToExtractSchema(HOTEL_SCHEMA).properties,
		// Override rooms to use HOTEL_ROOM_SCHEMA for proper nested structure
		rooms: {
			type: 'array',
			items: HOTEL_ROOM_SCHEMA,
			description: 'Array of room objects',
		},
		// Override reviews to use HOTEL_REVIEW_SCHEMA
		reviews: {
			type: 'array',
			items: HOTEL_REVIEW_SCHEMA,
			description: 'Array of review objects',
		},
	},
	required: ['name'],
};

// ============================================================================
// AGENT PROMPT
// ============================================================================

/**
 * Agent prompt for Firecrawl hotel extraction
 * Instructions for extracting hotel data from booking.com
 * @constant {string}
 */
export const HOTEL_AGENT_PROMPT = `Role: You are a 9Trip B2C hotel data extraction specialist. Extract structured data from this booking.com hotel page.

Context: The 9Trip platform manages hotel data in Firestore with a strict schema. Every field must conform.

Instructions:
1. Extract hotel data from the booking.com page
2. Click on gallery images to load ALL available photos at max1024x768 resolution
3. Expand room details by clicking "View details" buttons
4. Collect room data with all available information
5. Get up to 25 recent reviews

Extract the following:
1. Hotel name (exact name, trim whitespace)
2. Star rating (number 1-5, extract from stars/rating badge)
3. Address: street, city, country (from the address section)
4. Description (full hotel description, can include basic HTML)
5. Short excerpt (first 150 chars of description, plain text only)
6. Main/featured image URL (the primary hotel photo, full absolute URL)
7. Gallery image URLs (ALL available hotel photos, full absolute URLs, deduplicated)
8. Amenities/facilities list (all hotel facilities mentioned)
9. Highlights (top features or unique selling points, if available)
10. Guest rating: average score (number 1-10) and review count
11. Check-in and check-out times
12. Map coordinates (latitude, longitude) if available
13. Phone, email, website if available
14. Room types: for each room extract:
    - Room name (required)
    - Description
    - Bed type (e.g. "1 King bed", "2 Twin beds")
    - Max adults, max children, max guests
    - Room size in m²
    - Room amenities
    - What's included (meal plans, etc.)
    - Total rooms of this type (if available)
15. Recent reviews (max 25): for each review extract:
    - reviewerName
    - reviewerAvatar URL (if available)
    - rating (number 1-10)
    - text (full review text)
    - date (review date)
    - country (reviewer country)

Return ONLY a JSON object matching the schema. No extra text, no markdown.`;

/**
 * Generate room slug from room name
 * @param {string} roomName - Room name
 * @returns {string} Room slug
 */
function generateRoomSlug(roomName) {
	return generateSlug(roomName);
}

// ============================================================================
// HOTEL FIRESTORE MAPPING
// ============================================================================

/**
 * Map raw scraped hotel data to Firestore document structure per hotels.schema.md v4.0.0
 * @param {Object} rawData - Raw scraped data from Firecrawl
 * @returns {Object} Firestore-ready document object
 */
export function mapHotelToFirestore(rawData) {
	if (!rawData || typeof rawData !== 'object') {
		throw new Error('Invalid raw data: expected object');
	}

	// Generate slug from name
	const slug = rawData.slug || generateSlug(rawData.name);

	// Map rooms to embedded array with IDs and slugs
	const rooms = (rawData.rooms || []).map((room, index) => {
		const roomSlug = generateRoomSlug(room.name);
		return {
			id: `room_${roomSlug}`,
			name: room.name || '',
			slug: roomSlug,
			description: room.description || '',
			featuredImage: room.featuredImage || room.gallery?.[0] || '',
			gallery: Array.isArray(room.gallery) ? room.gallery.slice(0, 7) : [],
			bedType: room.bedType || '',
			maxAdults: room.maxAdults || 2,
			maxChildren: room.maxChildren || 0,
			maxGuests: room.maxGuests || (room.maxAdults || 2) + (room.maxChildren || 0),
			roomSize: room.roomSize || null,
			amenities: Array.isArray(room.amenities) ? room.amenities : [],
			included: Array.isArray(room.included) ? room.included : [],
			totalRooms: room.totalRooms || 1,
			isActive: true,
			sortOrder: index + 1,
		};
	});

	// Map reviews to embedded Map object
	const reviewsMap = {};
	(rawData.reviews || []).slice(0, 25).forEach((review, index) => {
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

	// Build tags from amenities and star rating
	const tags = Array.isArray(rawData.tags) ? [...rawData.tags] : [];
	if (rawData.starRating >= 4) tags.push('luxury');
	if (rawData.starRating === 5) tags.push('5-star');
	const amenityLower = (rawData.amenities || []).map((a) =>
		typeof a === 'string' ? a.toLowerCase() : ''
	);
	if (amenityLower.some((a) => a.includes('pool') || a.includes('bể bơi'))) tags.push('pool');
	if (amenityLower.some((a) => a.includes('spa'))) tags.push('spa');
	if (amenityLower.some((a) => a.includes('beach') || a.includes('biển'))) tags.push('beach');

	// Extract gallery URLs and normalize
	const gallery = (rawData.gallery || [])
		.map((url) => (typeof url === 'string' ? url.replace(/\/max\d+(?:x\d+)?\//i, '/max1024x768/') : ''))
		.filter(Boolean);

	// Build Firestore document
	const doc = {
		// Core
		name: rawData.name || '',
		slug,
		starRating: rawData.starRating || null,

		// Address
		address: rawData.address || null,

		// Pricing (basic only)
		pricing: {
			basePrice: rawData.pricing?.basePrice || rawData.pricing?.adultPrice || null,
			currency: rawData.pricing?.currency || 'VND',
		},

		// Content
		description: rawData.description || '',
		excerpt: rawData.excerpt || rawData.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
		featuredImage: rawData.featuredImage || gallery[0] || '',
		gallery: [...new Set(gallery)].slice(0, 30),

		// Features
		amenities: Array.isArray(rawData.amenities) ? rawData.amenities : [],
		highlights: Array.isArray(rawData.highlights) ? rawData.highlights : [],
		tags: [...new Set(tags)],

		// Ratings
		rating: {
			average: rawData.rating?.average || rawData.ratingAverage || 0,
			count: rawData.rating?.count || rawData.ratingCount || 0,
		},

		// Policies
		policies: {
			checkIn: rawData.policies?.checkIn || '',
			checkOut: rawData.policies?.checkOut || '',
			cancellation: rawData.policies?.cancellation || rawData.cancellationPolicy || '',
			children: rawData.policies?.children || rawData.childrenPolicy || '',
			pets: rawData.policies?.pets || '',
			taxes: rawData.policies?.taxes || '',
			notes: rawData.policies?.notes || '',
		},

		// Map
		map: rawData.map || null,

		// Contact
		phone: rawData.phone || '',
		email: rawData.email || '',
		website: rawData.website || '',

		// Embedded rooms (v4)
		rooms,

		// Embedded reviews
		reviews: reviewsMap,

		// Meta
		isFeatured: rawData.isFeatured || false,

		// Timestamps (caller should set these)
		createdAt: rawData.createdAt || new Date().toISOString(),
		updatedAt: rawData.updatedAt || new Date().toISOString(),

		// Internal tracking
		_firecrawlCredits: rawData._firecrawlCredits || 0,
	};

	return doc;
}

// ============================================================================
// TOUR SCHEMA
// ============================================================================

/**
 * Tour schema metadata definitions per tours.schema.md v2.0.0
 * @constant {Object<string, {type: string, required?: boolean, description: string}>}
 */
export const TOUR_SCHEMA = {
	// Core fields
	title: { type: 'string', required: true, description: 'Tour name/title (required)' },
	slug: { type: 'string', required: true, description: 'URL slug (unique)' },

	// Duration
	duration: { type: 'string', description: 'Duration string e.g. 3 ngày 2 đêm' },
	durationDays: { type: 'number', description: 'Number of days' },

	// Location
	location: { type: 'string', description: 'City/region name' },
	address: { type: 'string', description: 'Meeting point address' },
	locationId: { type: 'string', description: 'Reference to locations collection' },

	// Content
	description: { type: 'string', description: 'Full tour description (HTML)' },
	excerpt: { type: 'string', description: 'Short description, max 200 chars' },
	featuredImage: { type: 'string', description: 'Main photo URL' },
	gallery: { type: 'array', items: { type: 'string' }, description: 'All tour photo URLs' },

	// Features
	highlights: { type: 'array', items: { type: 'string' }, description: 'Tour highlights' },
	included: { type: 'array', items: { type: 'string' }, description: 'What is included' },
	excluded: { type: 'array', items: { type: 'string' }, description: 'What is not included' },
	categories: { type: 'array', items: { type: 'string' }, description: 'Tour type categories' },
	tags: { type: 'array', items: { type: 'string' }, description: 'Tags/keywords' },

	// Itinerary
	itinerary: {
		type: 'array',
		description: 'Day-by-day itinerary',
		items: {
			type: 'object',
			properties: {
				day: { type: 'number', description: 'Day number' },
				title: { type: 'string', description: 'Day title' },
				description: { type: 'string', description: 'Day description (HTML)' },
				meals: { type: 'string', description: 'Meals included' },
				overnight: { type: 'string', description: 'Overnight location' },
				images: { type: 'array', items: { type: 'string' }, description: 'Day images' },
			},
		},
	},

	// Map
	map: { type: 'object', description: 'Map coordinates', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },

	// Pricing (basic - detailed in tourPricing subcollection)
	pricing: {
		type: 'object',
		description: 'Basic pricing info',
		properties: {
			adultPrice: { type: 'number', description: 'Adult price (VND)' },
			childPrice: { type: 'number', description: 'Child price (VND)' },
			infantPrice: { type: 'number', description: 'Infant price (VND)' },
			currency: { type: 'string', description: 'Currency code' },
			minPeople: { type: 'number', description: 'Minimum people' },
			maxPeople: { type: 'number', description: 'Maximum people' },
			discountPercent: { type: 'number', description: 'Discount percent 0-100' },
		},
	},

	// Policies
	cancellationPolicy: { type: 'string', description: 'Cancellation policy (HTML)' },
	childrenPolicy: { type: 'string', description: 'Children policy (HTML)' },
	notes: { type: 'array', items: { type: 'string' }, description: 'Important traveler notes' },

	// FAQ
	faq: { type: 'array', description: 'FAQ items', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } } } },

	// Contact
	phone: { type: 'string', description: 'Phone number' },
	email: { type: 'string', description: 'Email address' },
	website: { type: 'string', description: 'Website URL - default: https://9tripphuquoc.com' },

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
	isFeatured: { type: 'boolean', description: 'Featured tour flag' },
	status: { type: 'string', description: 'Status: active/inactive' },
	metaTitle: { type: 'string', description: 'SEO title' },
	metaDescription: { type: 'string', description: 'SEO description' },
	createdAt: { type: 'timestamp', required: true, description: 'Creation timestamp' },
	updatedAt: { type: 'timestamp', required: true, description: 'Last update timestamp' },
};

/**
 * Required tour fields for validation
 * @constant {string[]}
 */
export const TOUR_REQUIRED_FIELDS = ['title', 'slug'];

// ============================================================================
// TOUR PRICING SCHEMA (for subcollection)
// ============================================================================

/**
 * Tour pricing tier schema for tourPricing subcollection
 * @constant {Object}
 */
export const TOUR_PRICING_SCHEMA = {
	type: 'object',
	properties: {
		id: { type: 'string', description: 'Price tier ID' },
		name: { type: 'string', description: 'Package name e.g. Tour ghép, Tour riêng' },
		description: { type: 'string', description: 'Package description' },
		isFeatured: { type: 'boolean', description: 'Featured tier flag' },
		adultPrice: { type: 'number', description: 'Adult price (VND)' },
		childPrice: { type: 'number', description: 'Child price (VND, 0 if free)' },
		infantPrice: { type: 'number', description: 'Infant price (VND, 0 if free)' },
		currency: { type: 'string', description: 'Currency code (default: VND)' },
		minPeople: { type: 'number', description: 'Minimum people' },
		maxPeople: { type: 'number', description: 'Maximum people' },
		included: { type: 'array', items: { type: 'string' }, description: 'Included items' },
		isActive: { type: 'boolean', description: 'Active status' },
		sortOrder: { type: 'number', description: 'Display order' },
		createdAt: { type: 'string', description: 'Creation timestamp' },
		updatedAt: { type: 'string', description: 'Last update timestamp' },
	},
	required: ['name'],
};

// ============================================================================
// TOUR FIRECRAWL EXTRACTION SCHEMA
// ============================================================================

/**
 * JSON Schema for Firecrawl tour detail extraction
 * Generated from TOUR_SCHEMA
 * @constant {Object}
 */
export const TOUR_EXTRACT_SCHEMA = {
	...schemaToExtractSchema(TOUR_SCHEMA),
	required: ['title'],
};

/**
 * Simplified flat schema for extract() API — optimized for LLM-powered extraction.
 * Uses flat properties (no deep nesting) to work reliably with the extract endpoint.
 * Costs ~5-15 credits vs 100-500 for the full agent schema.
 *
 * @constant {Object}
 */
export const TOUR_EXTRACT_SCHEMA_FLAT = {
	type: 'object',
	properties: {
		title: { type: 'string', description: 'Tour name/title (required)' },
		duration: { type: 'string', description: 'Duration e.g. "3 ngày 2 đêm"' },
		durationDays: { type: 'number', description: 'Number of days' },
		location: { type: 'string', description: 'City/region name' },
		address: { type: 'string', description: 'Meeting point address' },
		departureCity: { type: 'string', description: 'Departure city (e.g. Hà Nội, TP.HCM)' },
		description: { type: 'string', description: 'Full tour description (HTML ok)' },
		excerpt: { type: 'string', description: 'Short description max 200 chars' },
		featuredImage: { type: 'string', description: 'Main photo URL (full absolute)' },
		gallery: {
			type: 'array',
			items: { type: 'string' },
			description: 'ALL photo URLs (absolute, deduplicated)',
		},
		highlights: { type: 'array', items: { type: 'string' }, description: 'Top features' },
		included: { type: 'array', items: { type: 'string' }, description: 'What is included' },
		excluded: { type: 'array', items: { type: 'string' }, description: 'What is not included' },
		categories: { type: 'array', items: { type: 'string' }, description: 'Tour type categories' },
		itinerary: {
			type: 'array',
			description: 'Day-by-day itinerary',
			items: {
				type: 'object',
				properties: {
					day: { type: 'number' },
					title: { type: 'string' },
					description: { type: 'string' },
					meals: { type: 'string' },
				},
			},
		},
		adultPrice: { type: 'number', description: 'Adult price in VND' },
		childPrice: { type: 'number', description: 'Child price in VND' },
		currency: { type: 'string', description: 'Currency code (default: VND)' },
		cancellationPolicy: { type: 'string', description: 'Cancellation policy text' },
		childrenPolicy: { type: 'string', description: 'Children policy text' },
		notes: { type: 'array', items: { type: 'string' }, description: 'Important traveler notes' },
		faq: {
			type: 'array',
			items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } } },
			description: 'FAQ items',
		},
		phone: { type: 'string', description: 'Phone number' },
		email: { type: 'string', description: 'Email address' },
		website: { type: 'string', description: 'Website URL' },
	},
	required: ['title'],
};

/**
 * Schema metadata for list page items
 * @constant {Object}
 */
const TOUR_LIST_ITEM_SCHEMA = {
	title: { type: 'string', description: 'Tour name' },
	url: { type: 'string', description: 'Full absolute URL to tour detail page' },
	price: { type: 'number', description: 'Starting price' },
	duration: { type: 'string', description: 'Tour duration' },
	image: { type: 'string', description: 'Thumbnail URL' },
	category: { type: 'string', description: 'Tour category' },
};

/**
 * JSON Schema for Firecrawl tour list page extraction
 * Generated from TOUR_LIST_ITEM_SCHEMA
 * @constant {Object}
 */
export const TOUR_LIST_EXTRACT_SCHEMA = schemaToListExtractSchema(
	TOUR_LIST_ITEM_SCHEMA,
	'tours',
	{ requiredFields: ['title', 'url'] }
);

// ============================================================================
// TOUR AGENT PROMPT
// ============================================================================

/**
 * Agent prompt for Firecrawl tour extraction
 * @constant {string}
 */
export const TOUR_AGENT_PROMPT = `Role: You are a 9Trip B2C tour data extraction specialist. Extract structured data from this tour page.

Context: The 9Trip platform manages tour data in Firestore with a strict schema. Every field must conform.

Instructions:
1. Extract tour data from the page
2. Collect ALL itinerary details day by day
3. Get pricing information for different package tiers
4. Extract FAQ items if available
5. Get up to 10 recent reviews
6. Collect gallery images at high resolution

Extract the following:
- title: exact tour name (required)
- duration: e.g. "3 ngày 2 đêm"
- durationDays: number of days
- location: city/region
- address: meeting point
- description: FULL tour description (preserve HTML)
- excerpt: first 200 chars plain text
- featuredImage: main photo absolute URL
- gallery: ALL photo absolute URLs (deduplicated)
- highlights: array of top features
- included: what is included
- excluded: what is not included
- itinerary: array of {day, title, description(HTML), meals, overnight, images[]}
- categories: array of tour types
- map: {lat, lng}
- pricing: {adultPrice, childPrice, infantPrice, currency, minPeople, maxPeople}
- cancellationPolicy: full text
- childrenPolicy: full text
- notes: important traveler notes (array)
- faq: array of {question, answer}
- reviews: max 10 [{reviewerName, reviewerAvatar, rating(1-10), text, date, country}]
- phone, email, website

Return ONLY a JSON object matching the schema. No extra text, no markdown.`;

// ============================================================================
// TOUR FIRESTORE MAPPING
// ============================================================================

/**
 * Map raw scraped tour data to Firestore document structure per tours.schema.md v2.0.0
 * Returns both tour data and pricing tiers for subcollection
 * @param {Object} rawData - Raw scraped data from Firecrawl
 * @returns {{tourData: Object, pricingTiers: Array}} Firestore-ready objects
 */
export function mapTourToFirestore(rawData) {
	if (!rawData || typeof rawData !== 'object') {
		throw new Error('Invalid raw data: expected object');
	}

	// Generate slug from title
	const slug = rawData.slug || generateSlug(rawData.title);

	// Extract gallery URLs and normalize
	const gallery = (rawData.gallery || []).map((url) => (typeof url === 'string' ? url.replace(/\/max\d+(?:x\d+)?\//i, '/max1024x768/') : '')).filter(Boolean);

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

	// Build tags from categories, location, duration
	const tags = Array.isArray(rawData.tags) ? [...rawData.tags] : [];
	if (rawData.location) tags.push(rawData.location);
	if (rawData.duration) tags.push(rawData.duration);
	if (rawData.categories) tags.push(...rawData.categories);

	// Build pricing tiers for subcollection (if multiple tiers exist)
	const pricingTiers = [];
	if (rawData.pricing) {
		// Default tier from main pricing
		const defaultTier = {
			id: `tier_${slug}_default`,
			name: 'Tour ghép',
			description: 'Tour ghép đoàn tiêu chuẩn',
			isFeatured: true,
			adultPrice: rawData.pricing.adultPrice || 0,
			childPrice: rawData.pricing.childPrice || 0,
			infantPrice: rawData.pricing.infantPrice || 0,
			currency: rawData.pricing.currency || 'VND',
			minPeople: rawData.pricing.minPeople || 1,
			maxPeople: rawData.pricing.maxPeople || 20,
			included: Array.isArray(rawData.included) ? rawData.included : [],
			isActive: true,
			sortOrder: 1,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		pricingTiers.push(defaultTier);

		// Private tour tier if maxPeople is small
		if (rawData.pricing.maxPeople && rawData.pricing.maxPeople <= 8) {
			const privateTier = {
				id: `tier_${slug}_private`,
				name: 'Tour riêng',
				description: 'Tour riêng cho nhóm nhỏ',
				isFeatured: false,
				adultPrice: Math.round((rawData.pricing.adultPrice || 0) * 1.3),
				childPrice: rawData.pricing.childPrice || 0,
				infantPrice: rawData.pricing.infantPrice || 0,
				currency: rawData.pricing.currency || 'VND',
				minPeople: 1,
				maxPeople: rawData.pricing.maxPeople,
				included: Array.isArray(rawData.included) ? rawData.included : [],
				isActive: true,
				sortOrder: 2,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			pricingTiers.push(privateTier);
		}
	}

	// Map itinerary
	const itinerary = (rawData.itinerary || []).map((day, index) => ({
		day: day.day || index + 1,
		title: day.title || `Ngày ${day.day || index + 1}`,
		description: day.description || '',
		meals: day.meals || '',
		overnight: day.overnight || '',
		images: Array.isArray(day.images) ? day.images : [],
	}));

	// Build tour document
	const tourData = {
		// Core
		title: rawData.title || '',
		slug,

		// Duration
		duration: rawData.duration || '',
		durationDays: rawData.durationDays || null,

		// Location
		location: rawData.location || '',
		address: rawData.address || '',

		// Content
		description: rawData.description || '',
		excerpt: rawData.excerpt || rawData.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
		featuredImage: rawData.featuredImage || gallery[0] || '',
		gallery: [...new Set(gallery)].slice(0, 30),

		// Features
		highlights: Array.isArray(rawData.highlights) ? rawData.highlights : [],
		included: Array.isArray(rawData.included) ? rawData.included : [],
		excluded: Array.isArray(rawData.excluded) ? rawData.excluded : [],
		categories: Array.isArray(rawData.categories) ? rawData.categories : [],
		tags: [...new Set(tags)],

		// Itinerary
		itinerary,

		// Map
		map: rawData.map || null,

		// Basic pricing (ERP sync fields)
		pricing: {
			adultPrice: rawData.pricing?.adultPrice || null,
			childPrice: rawData.pricing?.childPrice || null,
			infantPrice: rawData.pricing?.infantPrice || null,
			currency: rawData.pricing?.currency || 'VND',
			minPeople: rawData.pricing?.minPeople || null,
			maxPeople: rawData.pricing?.maxPeople || null,
			discountPercent: rawData.pricing?.discountPercent || 0,
		},

		// Policies
		cancellationPolicy: rawData.cancellationPolicy || '',
		childrenPolicy: rawData.childrenPolicy || '',
		notes: Array.isArray(rawData.notes) ? rawData.notes : [],

		// FAQ
		faq: Array.isArray(rawData.faq) ? rawData.faq : [],

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

	return { tourData, pricingTiers };
}

// ============================================================================
// ACTIVITY SCHEMA
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
// ACTIVITY EXTRACTION SCHEMA
// ============================================================================

/**
 * JSON Schema for activity extraction
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
 * JSON Schema for activity list page extraction
 * Generated from ACTIVITY_LIST_ITEM_SCHEMA
 * @constant {Object}
 */
export const ACTIVITY_LIST_EXTRACT_SCHEMA = schemaToListExtractSchema(
	ACTIVITY_LIST_ITEM_SCHEMA,
	'activities',
	{ requiredFields: ['title', 'url'] }
);

// ============================================================================
// ACTIVITY AGENT PROMPT
// ============================================================================

/**
 * Agent extraction configuration for activity data
 * Defines the fields to extract using agent-browser automation
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
// ACTIVITY FIRESTORE MAPPING
// ============================================================================

/**
 * Map raw scraped activity data to Firestore document structure per activities.schema.md v4.0.0
 * @param {Object} rawData - Raw scraped data from Firecrawl
 * @returns {Object} Firestore-ready document object
 */
export function mapActivityToFirestore(rawData) {
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
		_sourceUrl: rawData._sourceUrl || '',
	};

	return doc;
}

// ============================================================================
// BLOG SCHEMA
// ============================================================================

/**
 * Blog post schema metadata definitions
 * @constant {Object<string, {type: string, required?: boolean, description: string}>}
 */
export const BLOG_SCHEMA = {
	title: { type: 'string', required: true, description: 'Post title' },
	slug: { type: 'string', required: true, description: 'URL-safe slug' },
	excerpt: { type: 'string', description: 'Short summary (max 150-200 chars)' },
	content: { type: 'string', description: 'Full HTML content (300+ words)' },
	featuredImage: { type: 'string', description: 'Main image URL' },
	author: { type: 'string', description: 'Author name' },
	category: { type: 'string', description: 'Primary category' },
	tags: { type: 'array', items: { type: 'string' }, description: 'List of tags' },
	createdAt: { type: 'timestamp', required: true, description: 'Creation timestamp' },
	updatedAt: { type: 'timestamp', required: true, description: 'Last update timestamp' },
	status: { type: 'string', description: 'Post status: published | draft' },
};

export default BLOG_SCHEMA;
