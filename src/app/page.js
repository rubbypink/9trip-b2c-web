import { SITE, SITE_DESCRIPTION, PAGE_SIZE } from "@/lib/constants";
import { searchTours, countTours, searchHotels, searchActivities } from "@/lib/firestore-admin";
import { getStorageImageUrl } from "@/lib/storage-admin";
import { logger } from "@/lib/logger";
import HeroBanner from "@/components/home/HeroBanner";
import FeaturedHotelsServer from "@/components/home/FeaturedHotelsServer";
import FlashDealsServer from "@/components/home/FlashDealsServer";
import FeaturedToursServer from "@/components/home/FeaturedToursServer";
import DestinationGuide from "@/components/home/DestinationGuide";
import Testimonials from "@/components/home/Testimonials";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import LatestNews from "@/components/home/LatestNews";
import ListingPreload from "@/components/home/ListingPreload";

/**
 * HomePage — Trang chủ 9 Trip Phú Quốc.

 * Layout: Hero → Khách sạn nổi bật → Flash Deals → Tour nổi bật → Điểm đến → Đánh giá
 */
export default async function HomePage() {
  const [toursData, hotelsData, activitiesData] = await fetchPage1Data();

  const siteUrl = SITE.url;

  const siteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/tours?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const toursItemList = toursData.items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tour du lịch nổi bật",
    url: `${siteUrl}/tours`,
    numberOfItems: toursData.totalCount,
    itemListElement: toursData.items.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `${siteUrl}/tours/${t.slug}`,
      image: t.featuredImage || undefined,
    })),
  } : null;

  const hotelsItemList = hotelsData.items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Khách sạn nổi bật",
    url: `${siteUrl}/hotels`,
    numberOfItems: hotelsData.totalCount,
    itemListElement: hotelsData.items.map((h, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: h.name,
      url: `${siteUrl}/hotels/${h.slug}`,
      image: h.featuredImage || undefined,
    })),
  } : null;

  const activitiesItemList = activitiesData.items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hoạt động trải nghiệm nổi bật",
    url: `${siteUrl}/activities`,
    numberOfItems: activitiesData.totalCount,
    itemListElement: activitiesData.items.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.title,
      url: `${siteUrl}/activities/${a.slug}`,
      image: a.featuredImage || undefined,
    })),
  } : null;

  const preloadData = { tours: toursData, hotels: hotelsData, activities: activitiesData };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
      {toursItemList && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toursItemList) }} />}
      {hotelsItemList && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelsItemList) }} />}
      {activitiesItemList && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(activitiesItemList) }} />}
      <script id="listing-preload-data" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(preloadData) }} />
      <ListingPreload />
      <HeroBanner />
      <FeaturedHotelsServer />
      <FlashDealsServer />
      <FeaturedToursServer />
      <DestinationGuide />
      <WhyChooseUs />
      <Testimonials />
      <LatestNews />
    </>
  );
}
