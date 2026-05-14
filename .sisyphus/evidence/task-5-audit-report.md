# Firestore Data Audit Report — Task 5

**Date:** 2026-05-06  
**Status:** FIRESTORE_UNAVAILABLE — check .env.local  
**Reason:** Firebase Admin credentials (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) not found in environment. Audit based on schema files and source code analysis.

---

## 1. Tours Collection

### Fields Audited: `amenities`, `ratingCount`, `reviewCount`

| Field | Present in Schema? | Present in Code? | Notes |
|-------|-------------------|-----------------|-------|
| `amenities` | ❌ NOT in tour schema | ❌ Not referenced | Tours use `highlights`, `included`, `excluded`, `categories`, `tags` — no `amenities` field |
| `ratingCount` | ❌ NOT in tour schema | ⚠️ Referenced in code | `src/app/page.js` uses `t.ratingCount \|\| 0`; `src/app/tours/[slug]/page.js` uses `tour.ratingCount \|\| 0`. The `migrateData.js` script migrates `ratingCount` → `rating.count`. **May exist as legacy field in some documents** |
| `reviewCount` | ❌ NOT in tour schema | ⚠️ Referenced in mock data | `src/lib/mockData.js` uses `reviewCount` for tours. Not in schema definition. **Legacy field, may exist in some documents** |

### Tour Schema Fields (from `tour.js`):
- Core: `title`, `slug`, `duration`, `durationDays`, `location`, `address`, `locationId`
- Content: `description`, `excerpt`, `featuredImage`, `gallery`
- Features: `highlights`, `included`, `excluded`, `categories`, `tags`
- Itinerary: `itinerary[]`
- Pricing: `pricing` object (adultPrice, childPrice, infantPrice, currency, minPeople, maxPeople, discountPercent)
- Reviews: `reviews` (embedded map, NOT a separate count field)
- Meta: `isFeatured`, `status`, `metaTitle`, `metaDescription`, `createdAt`, `updatedAt`

### Key Finding:
- Tours do **NOT** have an `amenities` field in schema. The concept of "amenities" is covered by `included`/`excluded` arrays.
- `ratingCount` and `reviewCount` are **NOT** in the schema but are referenced in UI code with fallback values (`|| 0`). The migration script converts `ratingCount` → `rating.count`. Some documents may still have the legacy `ratingCount` field.

---

## 2. Activities Collection

### Fields Audited: `amenities`, `ratingCount`, `reviewCount`

| Field | Present in Schema? | Present in Code? | Notes |
|-------|-------------------|-----------------|-------|
| `amenities` | ❌ NOT in activity schema | ❌ Not referenced | Activities use `highlights`, `included`, `excluded`, `categories`, `tags` — no `amenities` field |
| `ratingCount` | ✅ YES — defined in schema | ✅ Referenced in code | `ACTIVITY_SCHEMA.ratingCount` = `{ type: 'number', description: 'Number of reviews' }`. Also used in `src/app/page.js` as `a.ratingCount \|\| a.rating?.count \|\| 0` |
| `reviewCount` | ❌ NOT in activity schema | ⚠️ Referenced in UI | `src/app/activities/[slug]/page.js` uses `reviewCount: totalRating`. Not a stored field — computed from reviews |

### Activity Schema Fields (from `activity.js`):
- Core: `slug`, `title`
- Content: `excerpt`, `description`, `featuredImage`, `gallery`
- Duration & Location: `duration`, `durationDetail`, `location`, `locationId`, `locationDetail`
- Schedule: `openingHours`, `capacity`
- Features: `highlights`, `included`, `excluded`, `categories`, `tags`
- Pricing: `pricing` object with `basePrice`, `adultPrice`, `childPrice`, `currency`, `tiers[]`
- Ratings: `ratingAverage` (number), `ratingCount` (number)
- Reviews: `reviews` (embedded map)
- Meta: `isFeatured`, `status`, `metaTitle`, `metaDescription`, `createdAt`, `updatedAt`

### Key Finding:
- Activities do **NOT** have an `amenities` field.
- `ratingCount` IS a defined schema field for activities.
- `reviewCount` is NOT a stored field — it's computed in UI from review data.

---

## 3. Hotels Collection

### Fields Audited: `amenities`

| Field | Present in Schema? | Present in Code? | Notes |
|-------|-------------------|-----------------|-------|
| `amenities` | ✅ YES — `{ type: 'array', items: { type: 'string' }, description: 'Hotel facilities' }` | ✅ Used extensively | `searchHotels` in `firestore-admin.js` filters by amenities. Hotel rooms also have `amenities` arrays |

### Hotel Schema Fields (from `hotel.js`):
- Core: `name`, `slug`, `starRating`
- Address: `address` object (street, city, cityId, country)
- Pricing: `pricing` object (basePrice, currency)
- Content: `description`, `excerpt`, `featuredImage`, `gallery`
- Features: `amenities[]`, `highlights[]`, `tags[]`
- Ratings: `rating` object (average, count)
- Policies: `policies` object (checkIn, checkOut, cancellation, children, pets, taxes, notes)
- Rooms: `rooms[]` (embedded array with `amenities[]` per room)
- Reviews: `reviews` (embedded map)
- Meta: `isFeatured`, `createdAt`, `updatedAt`

### Key Finding:
- Hotels **DO** have an `amenities` field — it's an array of strings describing hotel facilities.
- Hotel rooms also have their own `amenities` arrays (e.g., "Điều hòa", "TV", "Wifi", "Minibar").

---

## 4. Users Collection

### Fields Audited: user documents, `wishlist` field

| Field | Present in Code? | Notes |
|-------|-----------------|-------|
| `wishlist` | ✅ YES | `toggleWishlist()` uses `arrayUnion`/`arrayRemove` on `wishlist` field. `getUserWishlist()` reads `userProfile.wishlist` |

### User Profile Structure (from `firestore.js`):
- `upsertUserProfile(uid, profileData)` — creates/updates user profile
- `getUserProfile(uid)` — fetches user profile
- `toggleWishlist(uid, serviceId, isAdding)` — adds/removes service IDs from `wishlist` array
- `getUserWishlist(uid)` — resolves wishlist IDs to actual tour/hotel/activity documents

### Key Finding:
- Users **DO** have a `wishlist` field — it's an array of service IDs (strings) referencing tours, hotels, or activities.
- User documents are created via `upsertUserProfile()` which sets `createdAt`/`updatedAt` timestamps.

---

## 5. Bookings Collection — contactInfo Structure

### From `useBooking.js` (lines 86-108):

```js
contactInfo: {
  email: string,
  phone: string,
  fullName: string,
  // ... other fields
}
```

The `contactInfo` object is embedded in booking documents with `email` and `phone` fields.

### Key Finding for Lookup Functions:
- `findBookingsByEmail(email)` → query `bookings` where `contactInfo.email == email`
- `findBookingsByPhone(phone)` → query `bookings` where `contactInfo.phone == phone`
- Firestore supports nested field queries using dot notation: `contactInfo.email`

---

## 6. Reviews Collection — userEmail Field

### From Review Forms:
- `WriteReviewForm.jsx` stores: `serviceId`, `serviceType`, `userId`, `userName`, `rating`, `comment`, `createdAt`
- `ReviewModal.jsx` stores: `userId`, `userName`, `userAvatar`, `serviceId`, `serviceType`, `bookingId`, `rating`, `comment`, `status`

### Key Finding:
- ⚠️ `userEmail` is **NOT** currently populated in review documents by the existing review submission forms.
- `findReviewsByEmail(email)` → query `reviews` where `userEmail == email`
- **Recommendation:** The review submission forms should be updated to include `userEmail` (from `user.email`) for this lookup to return results. Alternatively, consider querying by `userId` and joining with user profile data.

---

## Summary Table

| Collection | `amenities` | `ratingCount` | `reviewCount` | `wishlist` | Notes |
|-----------|-------------|---------------|---------------|-----------|-------|
| **tours** | ❌ Not in schema | ⚠️ Legacy field, may exist | ⚠️ Mock data only | N/A | Uses `included`/`excluded` instead of `amenities` |
| **activities** | ❌ Not in schema | ✅ Schema field | ❌ Computed in UI | N/A | Has `ratingCount` as defined field |
| **hotels** | ✅ Array of strings | N/A (uses `rating.count`) | N/A (uses `rating.count`) | N/A | `amenities` is a proper array field |
| **users** | N/A | N/A | N/A | ✅ Array of service IDs | Wishlist stores service IDs |

---

## Recommendations

1. **Tours:** If `amenities` is needed, add it to the tour schema and update the scraper mapping. Currently, `included`/`excluded` serve a similar purpose.
2. **Tours `ratingCount`:** Run migration to ensure all tour documents use `rating.count` instead of the flat `ratingCount`. The `migrateData.js` script already handles this.
3. **Activities:** `ratingCount` is properly defined. No action needed.
4. **Reviews `userEmail`:** Update `WriteReviewForm.jsx` and `ReviewModal.jsx` to include `userEmail: user.email` in review data for the `findReviewsByEmail()` lookup to work.
5. **Firestore Indexes:** The new lookup functions will need composite indexes for optimal query performance:
   - `bookings` collection: index on `contactInfo.email` and `contactInfo.phone`
   - `reviews` collection: index on `userEmail`