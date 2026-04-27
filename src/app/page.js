import HeroBanner from "@/components/home/HeroBanner";
import FeaturedHotelsServer from "@/components/home/FeaturedHotelsServer";
import FlashDealsServer from "@/components/home/FlashDealsServer";
import FeaturedToursServer from "@/components/home/FeaturedToursServer";
import DestinationGuide from "@/components/home/DestinationGuide";
import Testimonials from "@/components/home/Testimonials";

/**
 * HomePage — Trang chủ 9 Trip Phú Quốc.
 * Layout: Hero → Khách sạn nổi bật → Flash Deals → Tour nổi bật → Điểm đến → Đánh giá
 */
export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <FeaturedHotelsServer />
      <FlashDealsServer />
      <FeaturedToursServer />
      <DestinationGuide />
      <Testimonials />
    </>
  );
}