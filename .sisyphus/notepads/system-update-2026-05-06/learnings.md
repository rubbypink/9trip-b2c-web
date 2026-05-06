## Wishlist Blank Page Fix\n- Added optional chaining and fallback values for wishlist items\n- Removed duplicate AuthGuard in WishlistPageClient\n- Updated empty state CTA to 'Khám phá ngay'\n- Handled null items from deleted services
- When implementing carousels, avoid using `element.scrollIntoView()` as it can cause the entire page to scroll if the element is not fully in the viewport. Instead, use `container.scrollTo({ left: targetPosition, behavior: 'smooth' })` to contain the scroll within the carousel.
- Added Best Price Badge, Amenities Icons, and Rating to TourCard
- Added getBlogBySlug and getRelatedBlogs to firestore-admin.js
## Search Page Disabled
- Replaced `src/app/search/page.jsx` with a redirect to `/` using `next/navigation`.
- Added mandatory JSDoc as per project rules.
