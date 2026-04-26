/**
 * BestActivities section — Server Component hiển thị activity nổi bật.
 * Fetch từ Firestore, hiển thị dạng grid 3 cột.
 */
import { getActivitiesList } from "@/lib/firestore";
import ActivityCard from "@/components/shared/ActivityCard";
import Link from "next/link";

export default async function BestActivities() {
  const { activities } = await getActivitiesList({ pageSize: 6 });

  if (!activities || activities.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Trải nghiệm thú vị
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Khám phá những hoạt động hấp dẫn nhất tại điểm đến của bạn — từ tham quan, ẩm thực đến phiêu lưu mạo hiểm.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/activities"
            className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-600 hover:text-white transition-all"
          >
            Xem tất cả hoạt động
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}