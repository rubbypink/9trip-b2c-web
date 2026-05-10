import SearchTabs from "./SearchTabs";

/**
 * HeroBanner — Khu vực hero của trang chủ với background image + thanh tìm kiếm chính.
 * Cập nhật: Sử dụng ảnh banner 1920x300 làm background và điều chỉnh padding để phù hợp với tỷ lệ ảnh.
 * @returns {JSX.Element}
 */
export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://firebasestorage.googleapis.com/v0/b/tripphuquoc-db-fs.firebasestorage.app/o/images%2Fbanners%2Fhero-banner.webp?alt=media"
          alt="Hero Banner"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-10 sm:py-14 lg:py-16">
        {/* Headline */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Khám phá <span className="text-primary-400">Việt Nam</span> theo cách của bạn
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-slate-100 drop-shadow-md">
            Hàng nghìn tour du lịch, khách sạn, vé máy bay và trải nghiệm — tất cả trong một nền tảng.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-black/30 border border-white/20 p-1 ring-1 ring-white/10">
          <SearchTabs />
        </div>

        {/* Quick stats */}
        <div className="mt-10 flex flex-wrap justify-center gap-4 sm:gap-8 text-center">
          <div className="bg-black/30 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/10 min-w-[120px]">
            <p className="text-2xl font-bold text-primary-400">500+</p>
            <p className="text-xs text-slate-300 uppercase tracking-wider font-medium">Tour hấp dẫn</p>
          </div>
          <div className="bg-black/30 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/10 min-w-[120px]">
            <p className="text-2xl font-bold text-accent">200+</p>
            <p className="text-xs text-slate-300 uppercase tracking-wider font-medium">Khách sạn</p>
          </div>
          <div className="bg-black/30 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/10 min-w-[120px]">
            <p className="text-2xl font-bold text-secondary">50K+</p>
            <p className="text-xs text-slate-300 uppercase tracking-wider font-medium">Khách hàng</p>
          </div>
          <div className="bg-black/30 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/10 min-w-[120px]">
            <p className="text-2xl font-bold text-primary-300">4.8</p>
            <p className="text-xs text-slate-300 uppercase tracking-wider font-medium">Đánh giá ★</p>
          </div>
        </div>
      </div>
    </section>
  );
}
