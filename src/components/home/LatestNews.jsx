/**
 * LatestNews / BlogPosts section — hiển thị bài viết mới nhất.
 * Hiện dùng fallback tĩnh, sẽ tích hợp blog sau.
 */
import Link from "next/link";

const fallbackPosts = [
  {
    id: "1",
    title: "Top 10 điểm đến hot nhất Việt Nam 2026",
    excerpt: "Khám phá những địa danh đẹp ngất ngây từ Bắc vào Nam, từ ruộng bậc thang Sapa đến biển xanh Phú Quốc.",
    image: null,
    date: "2026-04-20",
    slug: "top-10-diem-den-hot-2026",
  },
  {
    id: "2",
    title: "Kinh nghiệm săn tour giá rẻ mùa cao điểm",
    excerpt: "Bí quyết đặt tour tiết kiệm chi phí mà vẫn đảm bảo chất lượng cho kỳ nghỉ gia đình.",
    image: null,
    date: "2026-04-15",
    slug: "kinh-nghiem-san-tour-gia-re",
  },
  {
    id: "3",
    title: "Cẩm nang du lịch Đà Nẵng - Hội An từ A-Z",
    excerpt: "Tất tần tật từ di chuyển, ăn uống, tham quan đến lưu trú cho chuyến đi miền Trung trọn vẹn.",
    image: null,
    date: "2026-04-10",
    slug: "cam-nang-du-lich-da-nang-hoi-an",
  },
];

export default function LatestNews() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Cẩm nang du lịch
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Mẹo hay, kinh nghiệm và cảm hứng cho chuyến đi tiếp theo của bạn.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {fallbackPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <svg className="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(post.date).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}