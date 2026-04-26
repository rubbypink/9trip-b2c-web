/**
 * FeaturedDestinations - Danh sách điểm đến nổi bật.
 * @param {{ destinations: Array<{ id: string, name: string, image: string, tourCount: number }> }} props
 */
import Link from "next/link";

export default function FeaturedDestinations({ destinations = [] }) {
  if (!destinations.length) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Điểm đến phổ biến
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Khám phá những điểm đến tuyệt vời nhất Việt Nam
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.id}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5]"
            >
              <img
                src={dest.image || "/placeholder-destination.jpg"}
                alt={dest.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-semibold text-lg leading-tight">{dest.name}</h3>
                <p className="text-sm text-white/80">{dest.tourCount} tour</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}