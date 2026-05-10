// DEPRECATED: Migrated to .agents/lib/scape-schemas.mjs
// /**
//  * @fileoverview Hotel Schema Module — Defines extraction schemas, agent prompts, and Firestore mapping for hotels.
//  * @module hotel-schema
//  * @version 4.0.0
//  */
// 
// import { schemaToExtractSchema } from '../schema-utils.mjs';
// 
// // ============================================================================
// // HOTEL SCHEMA METADATA
// // ============================================================================
// 
// /**
//  * Hotel schema metadata definitions per hotels.schema.md v4.0.0
//  * @constant {Object<string, {type: string, required?: boolean, description: string}>}
//  */
// export const HOTEL_SCHEMA = {
// 	// Core fields
// 	name: { type: 'string', required: true, description: 'Hotel name (required)' },
// 	slug: { type: 'string', required: true, description: 'URL slug (unique)' },
// 	starRating: { type: 'number', description: 'Star rating 1-5' },
// 
// 	// Address
// 	address: {
// 		type: 'object',
// 		description: 'Address object',
// 		properties: {
// 			street: { type: 'string', description: 'Street address' },
// 			city: { type: 'string', description: 'City name' },
// 			cityId: { type: 'string', description: 'Reference to locations collection' },
// 			country: { type: 'string', description: 'Country name' },
// 		},
// 	},
// 
// 	// Pricing (basic info only - detailed pricing in hotel_price_schedules)
// 	pricing: {
// 		type: 'object',
// 		description: 'Basic pricing info',
// 		properties: {
// 			basePrice: { type: 'number', description: 'Base price in VND' },
// 			currency: { type: 'string', description: 'Currency code (default: VND)' },
// 		},
// 	},
// 
// 	// Content
// 	description: { type: 'string', description: 'Full hotel description (HTML)' },
// 	excerpt: { type: 'string', description: 'Short description, max 200 chars' },
// 	featuredImage: { type: 'string', description: 'Main photo URL' },
// 	gallery: { type: 'array', items: { type: 'string' }, description: 'All hotel photo URLs' },
// 
// 	// Features
// 	amenities: { type: 'array', items: { type: 'string' }, description: 'Hotel facilities' },
// 	highlights: { type: 'array', items: { type: 'string' }, description: 'Top features' },
// 	tags: { type: 'array', items: { type: 'string' }, description: 'Tags like resort, sea-view, pool' },
// 
// 	// Ratings
// 	rating: {
// 		type: 'object',
// 		description: 'Guest rating info',
// 		properties: {
// 			average: { type: 'number', description: 'Average guest rating 1-10' },
// 			count: { type: 'number', description: 'Number of reviews' },
// 		},
// 	},
// 
// 	// Policies
// 	policies: {
// 		type: 'object',
// 		description: 'Hotel policies',
// 		properties: {
// 			checkIn: { type: 'string', description: 'Check-in time e.g. 14:00' },
// 			checkOut: { type: 'string', description: 'Check-out time e.g. 12:00' },
// 			cancellation: { type: 'string', description: 'Cancellation policy (HTML)' },
// 			children: { type: 'string', description: 'Children policy (HTML)' },
// 			pets: { type: 'string', description: 'Pets policy (HTML)' },
// 			taxes: { type: 'string', description: 'Taxes & fees (HTML)' },
// 			notes: { type: 'string', description: 'Additional notes (HTML)' },
// 		},
// 	},
// 
// 	// Map
// 	map: {
// 		type: 'object',
// 		description: 'Map coordinates',
// 		properties: {
// 			lat: { type: 'number', description: 'Latitude' },
// 			lng: { type: 'number', description: 'Longitude' },
// 			zoom: { type: 'number', description: 'Zoom level' },
// 		},
// 	},
// 
// 	// Contact
// 	phone: { type: 'string', description: 'Phone number' },
// 	email: { type: 'string', description: 'Email address' },
// 	website: { type: 'string', description: 'Website URL' },
// 
// 	// Rooms (embedded array v4)
// 	rooms: {
// 		type: 'array',
// 		description: 'Embedded array of room objects',
// 		items: { ref: 'HOTEL_ROOM_SCHEMA' },
// 	},
// 
// 	// Meta
// 	isFeatured: { type: 'boolean', description: 'Featured hotel flag' },
// 	createdAt: { type: 'timestamp', required: true, description: 'Creation timestamp' },
// 	updatedAt: { type: 'timestamp', required: true, description: 'Last update timestamp' },
// };
// 
// /**
//  * Required hotel fields for validation
//  * @constant {string[]}
//  */
// export const HOTEL_REQUIRED_FIELDS = ['name', 'slug'];
// 
// // ============================================================================
// // ROOM SCHEMA
// // ============================================================================
// 
// /**
//  * Room object schema for embedded rooms array
//  * @constant {Object}
//  */
// export const HOTEL_ROOM_SCHEMA = {
// 	type: 'object',
// 	properties: {
// 		id: { type: 'string', description: 'Room ID (unique within hotel)' },
// 		name: { type: 'string', description: 'Room type name (required)' },
// 		slug: { type: 'string', description: 'URL slug (unique within hotel)' },
// 		description: { type: 'string', description: 'Room description (HTML)' },
// 		featuredImage: { type: 'string', description: 'Room featured image URL' },
// 		gallery: { type: 'array', items: { type: 'string' }, description: 'Room gallery URLs' },
// 		bedType: { type: 'string', description: 'Bed type e.g. 1 giường King' },
// 		maxAdults: { type: 'number', description: 'Maximum adults' },
// 		maxChildren: { type: 'number', description: 'Maximum children' },
// 		maxGuests: { type: 'number', description: 'Total maximum guests' },
// 		roomSize: { type: 'number', description: 'Room size in m²' },
// 		amenities: { type: 'array', items: { type: 'string' }, description: 'Room amenities' },
// 		included: { type: 'array', items: { type: 'string' }, description: 'Included items' },
// 		totalRooms: { type: 'number', description: 'Total physical rooms of this type' },
// 		isActive: { type: 'boolean', description: 'Active status' },
// 		sortOrder: { type: 'number', description: 'Display order' },
// 	},
// 	required: ['name'],
// };
// 
// // ============================================================================
// // REVIEW SCHEMA
// // ============================================================================
// 
// /**
//  * Review object schema for embedded reviews map
//  * @constant {Object}
//  */
// export const HOTEL_REVIEW_SCHEMA = {
// 	type: 'object',
// 	properties: {
// 		reviewerName: { type: 'string', description: 'Reviewer name' },
// 		reviewerAvatar: { type: 'string', description: 'Avatar URL' },
// 		rating: { type: 'number', description: 'Rating 1-10' },
// 		text: { type: 'string', description: 'Review text' },
// 		date: { type: 'string', description: 'Review date' },
// 		country: { type: 'string', description: 'Reviewer country' },
// 		sortOrder: { type: 'number', description: 'Display order' },
// 	},
// };
// 
// // ============================================================================
// // FIRECRAWL EXTRACTION SCHEMA
// // ============================================================================
// 
// /**
//  * JSON Schema for Firecrawl hotel extraction
//  * Generated from HOTEL_SCHEMA with sub-schema references
//  * @constant {Object}
//  */
// export const HOTEL_EXTRACT_SCHEMA = {
// 	...schemaToExtractSchema(HOTEL_SCHEMA),
// 	properties: {
// 		...schemaToExtractSchema(HOTEL_SCHEMA).properties,
// 		// Override rooms to use HOTEL_ROOM_SCHEMA for proper nested structure
// 		rooms: {
// 			type: 'array',
// 			items: HOTEL_ROOM_SCHEMA,
// 			description: 'Array of room objects',
// 		},
// 		// Override reviews to use HOTEL_REVIEW_SCHEMA
// 		reviews: {
// 			type: 'array',
// 			items: HOTEL_REVIEW_SCHEMA,
// 			description: 'Array of review objects',
// 		},
// 	},
// 	required: ['name'],
// };
// 
// // ============================================================================
// // AGENT PROMPT
// // ============================================================================
// 
// /**
//  * Agent prompt for Firecrawl hotel extraction
//  * Instructions for extracting hotel data from booking.com
//  * @constant {string}
//  */
// export const HOTEL_AGENT_PROMPT = `Role: You are a 9Trip B2C hotel data extraction specialist. Extract structured data from this booking.com hotel page.
// 
// Context: The 9Trip platform manages hotel data in Firestore with a strict schema. Every field must conform.
// 
// Instructions:
// 1. Extract hotel data from the booking.com page
// 2. Click on gallery images to load ALL available photos at max1024x768 resolution
// 3. Expand room details by clicking "View details" buttons
// 4. Collect room data with all available information
// 5. Get up to 25 recent reviews
// 
// Extract the following:
// 1. Hotel name (exact name, trim whitespace)
// 2. Star rating (number 1-5, extract from stars/rating badge)
// 3. Address: street, city, country (from the address section)
// 4. Description (full hotel description, can include basic HTML)
// 5. Short excerpt (first 150 chars of description, plain text only)
// 6. Main/featured image URL (the primary hotel photo, full absolute URL)
// 7. Gallery image URLs (ALL available hotel photos, full absolute URLs, deduplicated)
// 8. Amenities/facilities list (all hotel facilities mentioned)
// 9. Highlights (top features or unique selling points, if available)
// 10. Guest rating: average score (number 1-10) and review count
// 11. Check-in and check-out times
// 12. Map coordinates (latitude, longitude) if available
// 13. Phone, email, website if available
// 14. Room types: for each room extract:
//     - Room name (required)
//     - Description
//     - Bed type (e.g. "1 King bed", "2 Twin beds")
//     - Max adults, max children, max guests
//     - Room size in m²
//     - Room amenities
//     - What's included (meal plans, etc.)
//     - Total rooms of this type (if available)
// 15. Recent reviews (max 25): for each review extract:
//     - reviewerName
//     - reviewerAvatar URL (if available)
//     - rating (number 1-10)
//     - text (full review text)
//     - date (review date)
//     - country (reviewer country)
// 
// Return ONLY a JSON object matching the schema. No extra text, no markdown.`;
// 
// // ============================================================================
// // UTILITY FUNCTIONS
// // ============================================================================
// 
// /**
//  * Vietnamese diacritics map for slug generation
//  * @constant {Object<string, string>}
//  */
// const VIETNAMESE_DIACRITICS_MAP = {
// 	// Lowercase
// 	à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
// 	ă: 'a', ằ: 'a', ắ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
// 	â: 'a', ầ: 'a', ấ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
// 	đ: 'd',
// 	è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
// 	ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
// 	ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
// 	ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
// 	ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
// 	ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
// 	ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
// 	ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
// 	y: 'y', ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
// 	// Uppercase
// 	À: 'A', Á: 'A', Ả: 'A', Ã: 'A', Ạ: 'A',
// 	Ă: 'A', Ằ: 'A', Ắ: 'A', Ẳ: 'A', Ẵ: 'A', Ặ: 'A',
// 	Â: 'A', Ầ: 'A', Ấ: 'A', Ẩ: 'A', Ẫ: 'A', Ậ: 'A',
// 	Đ: 'D',
// 	È: 'E', É: 'E', Ẻ: 'E', Ẽ: 'E', Ẹ: 'E',
// 	Ê: 'E', Ề: 'E', Ế: 'E', Ể: 'E', Ễ: 'E', Ệ: 'E',
// 	Ì: 'I', Í: 'I', Ỉ: 'I', Ĩ: 'I', Ị: 'I',
// 	Ò: 'O', Ó: 'O', Ỏ: 'O', Õ: 'O', Ọ: 'O',
// 	Ô: 'O', Ồ: 'O', Ố: 'O', Ổ: 'O', Ỗ: 'O', Ộ: 'O',
// 	Ơ: 'O', Ờ: 'O', Ớ: 'O', Ở: 'O', Ỡ: 'O', Ợ: 'O',
// 	Ù: 'U', Ú: 'U', Ủ: 'U', Ũ: 'U', Ụ: 'U',
// 	Ư: 'U', Ừ: 'U', Ứ: 'U', Ử: 'U', Ữ: 'U', Ự: 'U',
// 	Y: 'Y', Ỳ: 'Y', Ý: 'Y', Ỷ: 'Y', Ỹ: 'Y', Ỵ: 'Y',
// };
// 
// /**
//  * Generate URL-friendly slug from text with Vietnamese diacritics support
//  * @param {string} text - Input text
//  * @returns {string} URL-friendly slug
//  */
// export function generateSlug(text) {
// 	if (!text || typeof text !== 'string') return '';
// 
// 	return text
// 		.toString()
// 		.trim()
// 		.split('')
// 		.map((char) => VIETNAMESE_DIACRITICS_MAP[char] || char)
// 		.join('')
// 		.toLowerCase()
// 		.replace(/[^a-z0-9\s-]/g, '')
// 		.replace(/\s+/g, '-')
// 		.replace(/-+/g, '-')
// 		.replace(/^-|-$/g, '');
// }
// 
// /**
//  * Generate room slug from room name
//  * @param {string} roomName - Room name
//  * @returns {string} Room slug
//  */
// function generateRoomSlug(roomName) {
// 	return generateSlug(roomName);
// }
// 
// /**
//  * Generate review key from reviewer name and date
//  * @param {Object} review - Review object
//  * @param {number} index - Review index
//  * @returns {string} Review key
//  */
// function generateReviewKey(review, index) {
// 	const nameSlug = generateSlug(review.reviewerName || 'anonymous');
// 	const dateSlug = generateSlug(review.date || '');
// 	return `review_${nameSlug}${dateSlug ? '-' + dateSlug : ''}-${index}`;
// }
// 
// // ============================================================================
// // FIRESTORE MAPPING
// // ============================================================================
// 
// /**
//  * Map raw scraped hotel data to Firestore document structure per hotels.schema.md v4.0.0
//  * @param {Object} rawData - Raw scraped data from Firecrawl
//  * @returns {Object} Firestore-ready document object
//  */
// export function MAP_TO_FIRESTORE(rawData) {
// 	if (!rawData || typeof rawData !== 'object') {
// 		throw new Error('Invalid raw data: expected object');
// 	}
// 
// 	// Generate slug from name
// 	const slug = rawData.slug || generateSlug(rawData.name);
// 
// 	// Map rooms to embedded array with IDs and slugs
// 	const rooms = (rawData.rooms || []).map((room, index) => {
// 		const roomSlug = generateRoomSlug(room.name);
// 		return {
// 			id: `room_${roomSlug}`,
// 			name: room.name || '',
// 			slug: roomSlug,
// 			description: room.description || '',
// 			featuredImage: room.featuredImage || room.gallery?.[0] || '',
// 			gallery: Array.isArray(room.gallery) ? room.gallery.slice(0, 7) : [],
// 			bedType: room.bedType || '',
// 			maxAdults: room.maxAdults || 2,
// 			maxChildren: room.maxChildren || 0,
// 			maxGuests: room.maxGuests || (room.maxAdults || 2) + (room.maxChildren || 0),
// 			roomSize: room.roomSize || null,
// 			amenities: Array.isArray(room.amenities) ? room.amenities : [],
// 			included: Array.isArray(room.included) ? room.included : [],
// 			totalRooms: room.totalRooms || 1,
// 			isActive: true,
// 			sortOrder: index + 1,
// 		};
// 	});
// 
// 	// Map reviews to embedded Map object
// 	const reviewsMap = {};
// 	(rawData.reviews || []).slice(0, 25).forEach((review, index) => {
// 		const key = generateReviewKey(review, index);
// 		reviewsMap[key] = {
// 			id: key,
// 			reviewerName: review.reviewerName || '',
// 			reviewerAvatar: review.reviewerAvatar || '',
// 			rating: review.rating || 0,
// 			text: review.text || '',
// 			date: review.date || '',
// 			country: review.country || '',
// 			sortOrder: index + 1,
// 		};
// 	});
// 
// 	// Build tags from amenities and star rating
// 	const tags = Array.isArray(rawData.tags) ? [...rawData.tags] : [];
// 	if (rawData.starRating >= 4) tags.push('luxury');
// 	if (rawData.starRating === 5) tags.push('5-star');
// 	const amenityLower = (rawData.amenities || []).map((a) =>
// 		typeof a === 'string' ? a.toLowerCase() : ''
// 	);
// 	if (amenityLower.some((a) => a.includes('pool') || a.includes('bể bơi'))) tags.push('pool');
// 	if (amenityLower.some((a) => a.includes('spa'))) tags.push('spa');
// 	if (amenityLower.some((a) => a.includes('beach') || a.includes('biển'))) tags.push('beach');
// 
// 	// Extract gallery URLs and normalize
// 	const gallery = (rawData.gallery || [])
// 		.map((url) => (typeof url === 'string' ? url.replace(/\/max\d+(?:x\d+)?\//i, '/max1024x768/') : ''))
// 		.filter(Boolean);
// 
// 	// Build Firestore document
// 	const doc = {
// 		// Core
// 		name: rawData.name || '',
// 		slug,
// 		starRating: rawData.starRating || null,
// 
// 		// Address
// 		address: rawData.address || null,
// 
// 		// Pricing (basic only)
// 		pricing: {
// 			basePrice: rawData.pricing?.basePrice || rawData.pricing?.adultPrice || null,
// 			currency: rawData.pricing?.currency || 'VND',
// 		},
// 
// 		// Content
// 		description: rawData.description || '',
// 		excerpt: rawData.excerpt || rawData.description?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
// 		featuredImage: rawData.featuredImage || gallery[0] || '',
// 		gallery: [...new Set(gallery)].slice(0, 30),
// 
// 		// Features
// 		amenities: Array.isArray(rawData.amenities) ? rawData.amenities : [],
// 		highlights: Array.isArray(rawData.highlights) ? rawData.highlights : [],
// 		tags: [...new Set(tags)],
// 
// 		// Ratings
// 		rating: {
// 			average: rawData.rating?.average || rawData.ratingAverage || 0,
// 			count: rawData.rating?.count || rawData.ratingCount || 0,
// 		},
// 
// 		// Policies
// 		policies: {
// 			checkIn: rawData.policies?.checkIn || '',
// 			checkOut: rawData.policies?.checkOut || '',
// 			cancellation: rawData.policies?.cancellation || rawData.cancellationPolicy || '',
// 			children: rawData.policies?.children || rawData.childrenPolicy || '',
// 			pets: rawData.policies?.pets || '',
// 			taxes: rawData.policies?.taxes || '',
// 			notes: rawData.policies?.notes || '',
// 		},
// 
// 		// Map
// 		map: rawData.map || null,
// 
// 		// Contact
// 		phone: rawData.phone || '',
// 		email: rawData.email || '',
// 		website: rawData.website || '',
// 
// 		// Embedded rooms (v4)
// 		rooms,
// 
// 		// Embedded reviews
// 		reviews: reviewsMap,
// 
// 		// Meta
// 		isFeatured: rawData.isFeatured || false,
// 
// 		// Timestamps (caller should set these)
// 		createdAt: rawData.createdAt || new Date().toISOString(),
// 		updatedAt: rawData.updatedAt || new Date().toISOString(),
// 
// 		// Internal tracking
// 		_firecrawlCredits: rawData._firecrawlCredits || 0,
// 	};
// 
// 	return doc;
// }
// 
// // Alias export for convenience
// export { MAP_TO_FIRESTORE as mapHotelToFirestore };
// 
// // [DEAD CODE] Default export — never imported as default by any skill
// // export default {
// // 	HOTEL_SCHEMA,
// // 	HOTEL_REQUIRED_FIELDS,
// // 	HOTEL_EXTRACT_SCHEMA,
// // 	HOTEL_AGENT_PROMPT,
// // 	HOTEL_ROOM_SCHEMA,
// // 	HOTEL_REVIEW_SCHEMA,
// // 	MAP_TO_FIRESTORE,
// // 	mapHotelToFirestore: MAP_TO_FIRESTORE,
// // 	generateSlug,
// // };
