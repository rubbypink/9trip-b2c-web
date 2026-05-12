import { SITE, SITE_DESCRIPTION, PAGE_SIZE } from '@/lib/constants';
import { searchTours, countTours, searchHotels, searchActivities } from '@/lib/firestore-admin';
import { getStorageImageUrl } from '@/lib/storage-admin';
import { logger } from '@/lib/logger';
import HeroBanner from '@/components/home/HeroBanner';
import FeaturedHotelsServer from '@/components/home/FeaturedHotelsServer';
import FlashDealsServer from '@/components/home/FlashDealsServer';
import FeaturedToursServer from '@/components/home/FeaturedToursServer';
import DestinationGuide from '@/components/home/DestinationGuide';
import Testimonials from '@/components/home/Testimonials';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import LatestNews from '@/components/home/LatestNews';
import ListingPreload from '@/components/home/ListingPreload';
import { mockLatestNews } from '@/lib/mockData';

export const metadata = {
	title: `${SITE.name} — ${SITE.tagline}`,
	description: SITE_DESCRIPTION,
	openGraph: { title: `${SITE.name} — ${SITE.tagline}`, description: SITE_DESCRIPTION, url: SITE.url, images: [{ url: '/images/logo.png' || '/images/favicon.webp', width: 630, height: 630 }] },
	alternates: { canonical: '/' },
};

/**
 * Resolve only the featuredImage field to a HTTPS URL.
 * Skips full gallery/rooms resolution for preload data.
 */
async function resolveFeaturedImage(doc) {
	if (!doc) return doc;
	const img = doc.featuredImage;
	if (typeof img === 'string') {
		doc.featuredImage = (await getStorageImageUrl(img)) || img;
	}
	return doc;
}

function stripTour(t) {
	return {
		id: t.id,
		slug: t.slug,
		title: t.title,
		featuredImage: t.featuredImage,
		location: t.locationName || t.location,
		excerpt: t.excerpt || '',
		durationDays: t.durationDays || t.duration?.days || 0,
		pricing: { adultPrice: t.pricing?.adultPrice || 0, childPrice: t.pricing?.childPrice || 0, currency: t.pricing?.currency || 'VND' },
		ratingAverage: t.ratingAverage || 0,
		ratingCount: t.ratingCount || 0,
	};
}

function stripHotel(h) {
	return {
		id: h.id,
		slug: h.slug,
		name: h.name || h.title,
		featuredImage: h.featuredImage,
		location: h.locationName || h.location || h.address?.city || '',
		starRating: h.starRating || 0,
		pricing: { basePrice: h.lowestPrice || h.pricing?.basePrice || 0, currency: 'VND' },
		ratingAverage: h.ratingAverage || h.rating?.average || 0,
		ratingCount: h.ratingCount || h.rating?.count || 0,
	};
}

function stripActivity(a) {
	return {
		id: a.id,
		slug: a.slug,
		title: a.title,
		featuredImage: a.featuredImage,
		location: a.locationName || a.location || '',
		excerpt: a.excerpt || '',
		pricing: { basePrice: a.pricing?.basePrice || 0, currency: a.pricing?.currency || 'VND' },
		ratingAverage: a.ratingAverage || a.rating?.average || 0,
		ratingCount: a.ratingCount || a.rating?.count || 0,
	};
}

async function fetchPage1Data() {
	const emptyFilters = { pageSize: PAGE_SIZE, page: 1, sortBy: 'newest' };

	return Promise.all([
		(async () => {
			try {
				const [{ tours: rawTours }, totalCount] = await Promise.all([searchTours(emptyFilters), countTours({})]);
				const tours = await Promise.all(rawTours.slice(0, PAGE_SIZE).map(resolveFeaturedImage));
				return { items: tours.map(stripTour), totalCount, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) };
			} catch (e) {
				logger.error('[Preload] tours:', e.message);
				return { items: [], totalCount: 0, totalPages: 0 };
			}
		})(),

		(async () => {
			try {
				const { hotels: rawHotels } = await searchHotels({ pageSize: PAGE_SIZE, sortBy: 'newest' });
				const hotels = await Promise.all(rawHotels.map(resolveFeaturedImage));
				return { items: hotels.map(stripHotel), totalCount: hotels.length, totalPages: Math.max(1, Math.ceil(hotels.length / PAGE_SIZE)) };
			} catch (e) {
				logger.error('[Preload] hotels:', e.message);
				return { items: [], totalCount: 0, totalPages: 0 };
			}
		})(),

		(async () => {
			try {
				const { activities: rawActivities, totalCount } = await searchActivities(emptyFilters);
				const activities = await Promise.all(rawActivities.slice(0, PAGE_SIZE).map(resolveFeaturedImage));
				return { items: activities.map(stripActivity), totalCount: totalCount || activities.length, totalPages: Math.max(1, Math.ceil((totalCount || activities.length) / PAGE_SIZE)) };
			} catch (e) {
				logger.error('[Preload] activities:', e.message);
				return { items: [], totalCount: 0, totalPages: 0 };
			}
		})(),
	]);
}

/**
 * HomePage — Trang chủ 9 Trip Phú Quốc.

 * Layout: Hero → Khách sạn nổi bật → Flash Deals → Tour nổi bật → Điểm đến → Đánh giá
 */
export default async function HomePage() {
	const [toursData, hotelsData, activitiesData] = await fetchPage1Data();

	const siteUrl = SITE.url;

	const siteJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE.name,
		url: siteUrl,
		description: SITE_DESCRIPTION,
		potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/tours?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
	};

	const toursItemList =
		toursData.items.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'ItemList',
					name: 'Tour du lịch nổi bật',
					url: `${siteUrl}/tours`,
					numberOfItems: toursData.totalCount,
					itemListElement: toursData.items.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.title, url: `${siteUrl}/tours/${t.slug}`, image: t.featuredImage || undefined })),
				}
			: null;

	const hotelsItemList =
		hotelsData.items.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'ItemList',
					name: 'Khách sạn nổi bật',
					url: `${siteUrl}/hotels`,
					numberOfItems: hotelsData.totalCount,
					itemListElement: hotelsData.items.map((h, i) => ({ '@type': 'ListItem', position: i + 1, name: h.name, url: `${siteUrl}/hotels/${h.slug}`, image: h.featuredImage || undefined })),
				}
			: null;

	const activitiesItemList =
		activitiesData.items.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'ItemList',
					name: 'Hoạt động trải nghiệm nổi bật',
					url: `${siteUrl}/activities`,
					numberOfItems: activitiesData.totalCount,
					itemListElement: activitiesData.items.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: `${siteUrl}/activities/${a.slug}`, image: a.featuredImage || undefined })),
				}
			: null;

	const preloadData = { tours: toursData, hotels: hotelsData, activities: activitiesData };

	const latestPosts = mockLatestNews.map((post) => ({ ...post, featuredImage: post.thumbnail, createdAt: post.publishedAt }));

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
			/>
			{toursItemList && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(toursItemList) }}
				/>
			)}
			{hotelsItemList && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelsItemList) }}
				/>
			)}
			{activitiesItemList && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(activitiesItemList) }}
				/>
			)}
			<script
				id="listing-preload-data"
				type="application/json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(preloadData) }}
			/>
			<ListingPreload />
			<HeroBanner />
			<FeaturedHotelsServer />
			<FlashDealsServer />
			<FeaturedToursServer />
			<DestinationGuide />
			<WhyChooseUs />
			<Testimonials />
			<LatestNews posts={latestPosts} />
		</>
	);
}
