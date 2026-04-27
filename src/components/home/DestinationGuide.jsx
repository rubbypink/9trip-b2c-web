import Link from "next/link";

/**
 * DestinationGuide — Grid hiển thị các điểm đến phổ biến.
 * Static data vì danh sách điểm đến ít thay đổi.
 */
export default function DestinationGuide() {
  const destinations = [
    {
      slug: "phu-quoc",
      name: "Phú Quốc",
      image: "https://images.unsplash.com/photo-1571054643426-5e3ea36e0787?w=600&q=80",
      count: "50+ tour",
      gradient: "from-teal-500/80 to-emerald-700/80",
    },
    {
      slug: "da-nang",
      name: "Đà Nẵng",
      image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80",
      count: "80+ tour",
      gradient: "from-blue-500/80 to-indigo-700/80",
    },
    {
      slug: "ha-long",
      name: "Hạ Long",
      image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=600&q=80",
      count: "40+ tour",
      gradient: "from-cyan-500/80 to-blue-700/80",
    },
    {
      slug: "nha-trang",
      name: "Nha Trang",
      image: "https://images.unsplash.com/photo-1570789213751-2d9841b72af9?w=600&q=80",
      count: "35+ tour",
      gradient: "from-sky-500/80 to-cyan-700/80",
    },
    {
      slug: "hoi-an",
      name: "Hội An",
      image: "https://images.unsplash.com/photo-1559592806-fca8a46ac77f?w=600&q=80",
      count: "45+ tour",
      gradient: "from-amber-500/80 to-orange-700/80",
    },
    {
      slug: "da-lat",
      name: "Đà Lạt",
      image: "https://images.unsplash.com/photo-1599055189495-ef3b45a7947c?w=600&q=80",
      count: "30+ tour",
      gradient: "from-pink-500/80 to-rose-700/80",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-10">
          <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">
            Khám phá
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Điểm đến hấp dẫn
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            Khám phá những điểm đến tuyệt vời nhất Việt Nam với hàng trăm tour được tuyển chọn.
          </p>
        </div>

        {/* Destination grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {destinations.map((dest) => (
            <Link
              key={dest.slug}
              href={`/tours?location=${dest.slug}`}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden"
            >
              {/* Background image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dest.image}
                alt={dest.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-t ${dest.gradient}`}
              />
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-lg drop-shadow-sm">
                  {dest.name}
                </h3>
                <p className="text-white/80 text-xs mt-0.5">{dest.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
