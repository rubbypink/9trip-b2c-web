import HeroBanner from "@/components/home/HeroBanner";
import FeaturedTours from "@/components/home/FeaturedTours";

/**
 * Home Page — Server Component (SSG + ISR).
 * Hiển thị HeroBanner, FeaturedTours, và các section khác.
 */
export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <FeaturedTours />
    </>
  );
}