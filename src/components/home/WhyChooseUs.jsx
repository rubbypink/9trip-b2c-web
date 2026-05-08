/**
 * WhyChooseUs / TrustBadges — Section hiển thị các lý do nên chọn 9 Trip.
 * Hiển thị dạng grid với icon, title và description.
 */

const REASONS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Đặt Tour An Toàn",
    description: "Bảo mật thanh toán, chỗ được giữ chắc chắn. Hoàn tiền nếu tour bị hủy.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Giá Tốt Nhất",
    description: "Giá trực tiếp từ hệ thống, không qua trung gian. Đảm bảo giá trị tốt nhất.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: "Hỗ Trợ 24/7",
    description: "Đội ngũ hỗ trợ nhiệt tình, sẵn sàng giải đáp mọi thắc mắc của bạn.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l2.286 7.032a1 1 0 00.95.69h7.397c.969 0 1.371 1.24.588 1.81l-5.985 4.346a1 1 0 00-.364 1.118l2.286 7.032c.3.921-.755 1.688-1.54 1.118l-5.985-4.347a1 1 0 00-1.176 0l-5.985 4.347c-.784.57-1.838-.197-1.539-1.118l2.286-7.032a1 1 0 00-.364-1.118L2.87 12.46c-.783-.57-.38-1.81.588-1.81h7.397a1 1 0 00.95-.69l2.285-7.032z" />
      </svg>
    ),
    title: "Đánh Giá Thực Tế",
    description: "Hàng nghìn đánh giá từ khách hàng đã trải nghiệm. Minh bạch và tin cậy.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-8 lg:py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Vì sao nên chọn 9 Trip?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Chúng tôi cam kết mang đến trải nghiệm du lịch tốt nhất với dịch vụ chuyên nghiệp
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {REASONS.map((reason, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl hover:bg-blue-50 transition-colors duration-300"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                {reason.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {reason.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}