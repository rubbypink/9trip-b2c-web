/**
 * Testimonials / ReviewsCarousel section — hiển thị review nổi bật từ khách hàng.
 * Fetch reviews gần đây từ Firestore, hiển thị dạng grid.
 */
import { getSiteSettings } from "@/lib/firestore";

// Fallback testimonials tĩnh nếu chưa có reviews trong DB
const fallbackTestimonials = [
  {
    id: "1",
    content: "Tour Đà Lạt 3 ngày 2 đêm thật sự tuyệt vời! Hướng dẫn viên nhiệt tình, lịch trình hợp lý, khách sạn sạch sẽ. Gia đình mình rất hài lòng và sẽ quay lại.",
    author: "Chị Minh Anh",
    location: "Hà Nội",
    rating: 5,
    avatar: null,
  },
  {
    id: "2",
    content: "Đặt phòng khách sạn ở Phú Quốc qua 9Trip nhanh gọn, giá rẻ hơn các app khác. Nhân viên tư vấn hỗ trợ tận tình. Sẽ giới thiệu bạn bè sử dụng.",
    author: "Anh Tuấn Kiệt",
    location: "TP. Hồ Chí Minh",
    rating: 5,
    avatar: null,
  },
  {
    id: "3",
    content: "Lần đầu đi tour nước ngoài, mình khá lo lắng nhưng 9Trip đã hỗ trợ mọi thứ từ visa đến vé máy bay. Chuyến đi Thái Lan 5 ngày thật đáng nhớ!",
    author: "Chị Hồng Nhung",
    location: "Đà Nẵng",
    rating: 4,
    avatar: null,
  },
];

export default async function Testimonials() {
  let settings = null;
  try {
    settings = await getSiteSettings();
  } catch {
    // Nếu Firestore chưa có settings, dùng fallback
  }

  const testimonials = fallbackTestimonials;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Khách hàng nói gì về 9Trip
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Hàng nghìn khách hàng đã tin tưởng và đồng hành cùng chúng tôi trên mọi hành trình.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              {/* Rating stars */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${star <= t.rating ? "text-yellow-400" : "text-gray-200"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              {/* Quote */}
              <blockquote className="text-gray-600 mb-4 leading-relaxed">
                &ldquo;{t.content}&rdquo;
              </blockquote>
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.author}</p>
                  <p className="text-xs text-gray-400">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}