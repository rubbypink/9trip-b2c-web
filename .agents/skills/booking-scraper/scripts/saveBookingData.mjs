/**
 * @fileoverview Simplified hotel data saver using shared helpers
 * Saves scraped hotel data to Firestore and uploads images to Storage
 * @module saveBookingData
 * @version 2.0.0
 */

import { initFirebaseApp, getFirestore, getBucket, docExists, setDoc, serverTimestamp } from '../../../lib/firebase-helpers.mjs';
import { downloadFile, toWebP, uploadToStorage } from '../../../lib/image-helpers.mjs';
import { slugify, nowISO, timestampForFile, generateReport } from '../../../lib/scrape-helpers.mjs';
import { sanitizeScrapedData } from '../../../lib/sanitize-data.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Domain-Specific Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate hotel data and check for duplicates
 * @param {object} data - Hotel data
 * @returns {Promise<{valid: boolean, slug: string, exists: boolean, error?: string}>}
 */
async function validateAndCheck(data) {
  // Validate required fields
  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, slug: '', exists: false, error: 'Hotel name is required' };
  }

  // Generate slug
  const slug = data.slug || slugify(data.name);

  // Check if hotel already exists
  const existing = await docExists('hotels', slug);
  if (existing.exists) {
    return { valid: true, slug, exists: true, existingId: slug };
  }

  return { valid: true, slug, exists: false };
}

/**
 * Build rooms map from rooms array with placeholders for raw images
 * @param {Array} rooms - Array of room objects
 * @returns {Map<string, object>} Rooms map with _rawFeatured and _rawGallery
 */
function buildRoomsMap(rooms) {
  const roomsMap = new Map();

  if (!Array.isArray(rooms)) return roomsMap;

  rooms.forEach((room, index) => {
    const roomId = room.id || `room_${slugify(room.name)}`;
    const roomSlug = room.slug || slugify(room.name);

    roomsMap.set(roomId, {
      id: roomId,
      slug: roomSlug,
      name: room.name || '',
      description: room.description || '',
      bedType: room.bedType || '',
      maxAdults: room.maxAdults || 2,
      maxChildren: room.maxChildren || 0,
      maxGuests: room.maxGuests || (room.maxAdults || 2) + (room.maxChildren || 0),
      roomSize: room.roomSize || null,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      included: Array.isArray(room.included) ? room.included : [],
      totalRooms: room.totalRooms || 1,
      isActive: room.isActive !== false,
      sortOrder: room.sortOrder || index + 1,
      // Placeholders for image processing
      _rawFeatured: room.featuredImage || '',
      _rawGallery: Array.isArray(room.gallery) ? room.gallery.slice(0, 5) : [],
      featuredImage: '',
      gallery: [],
    });
  });

  return roomsMap;
}

/**
 * Process room images: download, convert to WebP, upload to Storage
 * @param {string} hotelId - Hotel ID/slug
 * @param {Map<string, object>} roomsMap - Rooms map with _rawFeatured and _rawGallery
 * @param {import('firebase-admin').storage.Bucket} bucket - Storage bucket
 * @returns {Promise<Map<string, object>>} Updated rooms map with processed images
 */
async function processRoomImages(hotelId, roomsMap, bucket) {
  console.log(`   🏨 Processing ${roomsMap.size} room images...`);

  for (const [roomId, room] of roomsMap) {
    const roomDir = `hotels/${hotelId}/rooms/${roomId}`;

    // Process featured image (max 1)
    if (room._rawFeatured) {
      try {
        const buffer = await downloadFile(room._rawFeatured);
        const webpBuffer = await toWebP(buffer, { quality: 85, maxWidth: 1024 });
        const featuredUrl = await uploadToStorage(bucket, `${roomDir}/featured.webp`, webpBuffer);
        room.featuredImage = featuredUrl;
        console.log(`      ✓ ${room.name}: featured image uploaded`);
      } catch (err) {
        console.warn(`      ⚠️ ${room.name}: failed to process featured image - ${err.message}`);
      }
    }

    // Process gallery images (max 5 per room)
    const galleryUrls = [];
    const maxGallery = Math.min(room._rawGallery.length, 5);

    for (let i = 0; i < maxGallery; i++) {
      const imgUrl = room._rawGallery[i];
      try {
        const buffer = await downloadFile(imgUrl);
        const webpBuffer = await toWebP(buffer, { quality: 85, maxWidth: 1024 });
        const paddedIndex = String(i + 1).padStart(2, '0');
        const uploadedUrl = await uploadToStorage(bucket, `${roomDir}/gallery-${paddedIndex}.webp`, webpBuffer);
        galleryUrls.push(uploadedUrl);
      } catch (err) {
        console.warn(`      ⚠️ ${room.name}: gallery image ${i + 1} failed - ${err.message}`);
      }
    }

    room.gallery = galleryUrls;

    // Clean up raw image placeholders
    delete room._rawFeatured;
    delete room._rawGallery;
  }

  return roomsMap;
}

/**
 * Build reviews map from reviews array
 * @param {Array} reviews - Array of review objects
 * @returns {object} Reviews map with review_xxx keys
 */
function buildReviewsMap(reviews) {
  const reviewsMap = {};

  if (!Array.isArray(reviews)) return reviewsMap;

  // Limit to 25 reviews
  reviews.slice(0, 25).forEach((review, index) => {
    const key = `review_${String(index + 1).padStart(3, '0')}`;
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

  return reviewsMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Save Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save hotel data to Firestore with image processing
 * @param {object} inputData - Hotel data to save
 * @returns {Promise<{success: boolean, hotelId?: string, reportPath?: string, error?: string}>}
 */
export async function saveHotelData(inputData) {
  const startTime = Date.now();
  console.log('\n🏨 Saving hotel data...');

  try {
    // Initialize Firebase
    initFirebaseApp();
    const bucket = getBucket();

    // Sanitize data
    console.log('   🧹 Sanitizing data...');
    const { data: sanitizedData, warnings } = await sanitizeScrapedData(inputData, {
      type: 'hotel',
      knownNames: [inputData.name],
    });

    if (warnings.length > 0) {
      warnings.forEach((w) => console.warn(`   ⚠️  ${w}`));
    }

    // Validate and check for duplicates
    const validation = await validateAndCheck(sanitizedData);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const hotelId = validation.slug;

    if (validation.exists) {
      console.log(`   ℹ️  Hotel "${hotelId}" already exists, will update`);
    }

    // Process hotel images
    console.log('   🖼️  Processing hotel images...');
    let featuredImageUrl = sanitizedData.featuredImage || '';
    let galleryUrls = [];

    // Process featured image
    if (featuredImageUrl && featuredImageUrl.startsWith('http')) {
      try {
        const buffer = await downloadFile(featuredImageUrl);
        const webpBuffer = await toWebP(buffer, { quality: 90, maxWidth: 1920 });
        featuredImageUrl = await uploadToStorage(bucket, `hotels/${hotelId}/featured.webp`, webpBuffer);
        console.log('      ✓ Featured image uploaded');
      } catch (err) {
        console.warn(`      ⚠️  Featured image failed: ${err.message}`);
      }
    }

    // Process gallery images (max 30)
    if (Array.isArray(sanitizedData.gallery)) {
      const maxGallery = Math.min(sanitizedData.gallery.length, 30);
      console.log(`      Processing ${maxGallery} gallery images...`);

      for (let i = 0; i < maxGallery; i++) {
        const imgUrl = sanitizedData.gallery[i];
        if (!imgUrl || !imgUrl.startsWith('http')) continue;

        try {
          const buffer = await downloadFile(imgUrl);
          const webpBuffer = await toWebP(buffer, { quality: 85, maxWidth: 1920 });
          const paddedIndex = String(i + 1).padStart(2, '0');
          const uploadedUrl = await uploadToStorage(bucket, `hotels/${hotelId}/gallery/${paddedIndex}.webp`, webpBuffer);
          galleryUrls.push(uploadedUrl);
        } catch (err) {
          console.warn(`      ⚠️  Gallery image ${i + 1} failed: ${err.message}`);
        }
      }

      console.log(`      ✓ ${galleryUrls.length}/${maxGallery} gallery images uploaded`);
    }

    // Build and process rooms
    const roomsMap = buildRoomsMap(sanitizedData.rooms || []);
    await processRoomImages(hotelId, roomsMap, bucket);

    // Convert rooms Map to array for Firestore
    const roomsArray = Array.from(roomsMap.values());

    // Build reviews map
    const reviewsMap = buildReviewsMap(sanitizedData.reviews || []);

    // Prepare final hotel document
    const hotelData = {
      // Core fields
      name: sanitizedData.name,
      slug: hotelId,
      starRating: sanitizedData.starRating || null,

      // Address
      address: sanitizedData.address || null,

      // Pricing
      pricing: {
        basePrice: sanitizedData.pricing?.basePrice || null,
        currency: sanitizedData.pricing?.currency || 'VND',
      },

      // Content
      description: sanitizedData.description || '',
      excerpt: sanitizedData.excerpt || '',
      featuredImage: featuredImageUrl,
      gallery: galleryUrls,

      // Features
      amenities: sanitizedData.amenities || [],
      highlights: sanitizedData.highlights || [],
      tags: sanitizedData.tags || [],

      // Ratings
      rating: {
        average: sanitizedData.rating?.average || 0,
        count: sanitizedData.rating?.count || 0,
      },

      // Policies
      policies: {
        checkIn: sanitizedData.policies?.checkIn || '',
        checkOut: sanitizedData.policies?.checkOut || '',
        cancellation: sanitizedData.policies?.cancellation || '',
        children: sanitizedData.policies?.children || '',
        pets: sanitizedData.policies?.pets || '',
        taxes: sanitizedData.policies?.taxes || '',
        notes: sanitizedData.policies?.notes || '',
      },

      // Map
      map: sanitizedData.map || null,

      // Contact
      phone: sanitizedData.phone || '',
      email: sanitizedData.email || '',
      website: sanitizedData.website || '',

      // Embedded data
      rooms: roomsArray,
      reviews: reviewsMap,

      // Meta
      isFeatured: sanitizedData.isFeatured || false,

      // Timestamps
      updatedAt: serverTimestamp(),
    };

    // Only set createdAt if new document
    if (!validation.exists) {
      hotelData.createdAt = serverTimestamp();
    }

    // Save to Firestore
    await setDoc('hotels', hotelId, hotelData);
    console.log(`   ✅ Saved to Firestore: hotels/${hotelId}`);

    // Generate report
    const reportData = {
      ...hotelData,
      _processingStats: {
        durationMs: Date.now() - startTime,
        imagesProcessed: galleryUrls.length + roomsArray.length,
        roomsCount: roomsArray.length,
        reviewsCount: Object.keys(reviewsMap).length,
      },
    };

    const reportPath = await generateReport(reportData, 'hotel');
    console.log(`   📄 Report saved: ${reportPath}`);

    return {
      success: true,
      hotelId,
      reportPath,
    };
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point
// ─────────────────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  // Parse --input flag
  const inputArg = args.find((a) => a.startsWith('--input='));

  if (!inputArg) {
    console.log(`
Usage:
  node saveBookingData.mjs --input=<path-to-json-file>

Examples:
  node saveBookingData.mjs --input=../../.temp/booking-hotel-lahana-resort.json
  node saveBookingData.mjs --input=./my-hotel-data.json
`);
    process.exit(0);
  }

  const inputPath = inputArg.split('=')[1];

  // Resolve path (handle both relative and absolute)
  const fullPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);

  // Read input file
  if (!fs.existsSync(fullPath)) {
    console.error(`\n❌ File not found: ${fullPath}`);
    process.exit(1);
  }

  let inputData;
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    inputData = JSON.parse(content);
  } catch (err) {
    console.error(`\n❌ Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }

  // Save hotel data
  saveHotelData(inputData)
    .then((result) => {
      if (result.success) {
        console.log('\n✨ Success!');
        console.log(`   Hotel ID: ${result.hotelId}`);
        console.log(`   Report: ${result.reportPath}`);
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
  saveHotelData,
  validateAndCheck,
  buildRoomsMap,
  processRoomImages,
  buildReviewsMap,
};
