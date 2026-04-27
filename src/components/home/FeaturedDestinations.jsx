/**
 * FeaturedDestinations — Section hiển thị các điểm đến nổi bật dạng grid card.
 * Mỗi card hiển thị ảnh, tên địa điểm, số lượng tour.
 *
 * @param {{ locations: Array<{id: string, name: string, slug: string, featuredImage: string, tourCount?: number}> }} props
 */
export default function FeaturedDestinations({ locations }) {
  if (!locations || locations.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Điểm đến Nổi bật
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Khám phá những điểm đến được yêu thích nhất với các tour du lịch đa dạng
          </p>
        </div>

        {/* Destination Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {locations.map((loc) => (
            <a
              key={loc.id}
              href={`/destinations/${loc.slug}`}
              className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
            >
              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={loc.featuredImage || "/placeholder-destination.jpg"}
                  alt={loc.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-xl font-bold text-white group-hover:translate-y-[-2px] transition-transform">
                  {loc.name}
                </h3>
                {loc.tourCount != null && (
                  <p className="text-sm text-white/80 mt-1">
                    {loc.tourCount} tour
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <a
            href="/destinations"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            Xem tất cả điểm đến
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}