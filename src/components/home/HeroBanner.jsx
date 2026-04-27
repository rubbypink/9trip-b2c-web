import SearchTabs from "./SearchTabs";

/**
 * HeroBanner — Khu vực hero của trang chủ với background image + thanh tìm kiếm chính.
 */
export default function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden">
      {/* Background decor */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-200 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
        {/* Headline */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            Khám phá <span className="text-blue-600">Việt Nam</span> theo cách của bạn
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-gray-600">
            Hàng nghìn tour du lịch, khách sạn, vé máy bay và trải nghiệm — tất cả trong một nền tảng.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-1">
          <SearchTabs />
        </div>

        {/* Quick stats */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 sm:gap-10 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">500+</p>
            <p className="text-xs text-gray-500">Tour hấp dẫn</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">200+</p>
            <p className="text-xs text-gray-500">Khách sạn</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-500">50K+</p>
            <p className="text-xs text-gray-500">Khách hàng</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">4.8</p>
            <p className="text-xs text-gray-500">Đánh giá ★</p>
          </div>
        </div>
      </div>
    </section>
  );
}