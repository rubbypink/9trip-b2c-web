/**
 * TopHotels section — Server Component hiển thị khách sạn nổi bật.
 * Fetch từ Firestore, hiển thị dạng grid 3 cột.
 */
import { getFeaturedHotels } from "@/lib/firestore";
import HotelCard from "@/components/shared/HotelCard";
import Link from "next/link";

export default async function TopHotels() {
  const hotels = await getFeaturedHotels(6);

  if (!hotels || hotels.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Khách sạn hàng đầu
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Những khách sạn được đánh giá cao nhất với mức giá tốt nhất, sẵn sàng cho kỳ nghỉ của bạn.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/hotels"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Xem tất cả khách sạn
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}