import HeroBanner from "@/components/home/HeroBanner";
import SearchTabs from "@/components/home/SearchTabs";
import FeaturedDestinations from "@/components/home/FeaturedDestinations";
import FeaturedTours from "@/components/home/FeaturedTours";
import TopHotels from "@/components/home/TopHotels";
import BestActivities from "@/components/home/BestActivities";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Testimonials from "@/components/home/Testimonials";
import LatestNews from "@/components/home/LatestNews";

/**
 * Home Page — Server Component (SSG + ISR).
 * Hiển thị HeroBanner + SearchTabs, FeaturedDestinations, FeaturedTours,
 * TopHotels, BestActivities, WhyChooseUs, Testimonials, LatestNews.
 */
export default function HomePage() {
  return (
    <>
      <HeroBanner>
        <SearchTabs />
      </HeroBanner>
      <FeaturedDestinations />
      <FeaturedTours />
      <TopHotels />
      <BestActivities />
      <WhyChooseUs />
      <Testimonials />
      <LatestNews />
    </>
  );
}
