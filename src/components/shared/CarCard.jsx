/**
 * CarCard - Card hiển thị dịch vụ thuê xe.
 */
import Link from "next/link";
import PriceDisplay from "./PriceDisplay";
import StarRating from "./StarRating";

export default function CarCard({ car, item }) {
  const data = car || item;
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/cars/${data.slug}`} className="block relative aspect-[16/10] overflow-hidden">
        <img
          src={data.images?.[0] || "/placeholder-car.jpg"}
          alt={data.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold px-2 py-1 rounded">
          {data.carType}
        </span>
      </Link>
      <div className="p-4">
        <Link href={`/cars/${data.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1 mb-1">
          {data.name}
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">💺 {data.seats} chỗ</span>
          <span className="flex items-center gap-1">⚙️ {data.transmission === 'automatic' ? 'Tự động' : 'Số sàn'}</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={data.ratingAverage} size="xs" />
          <span className="text-xs text-gray-400">({data.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-50 pt-3">
          <PriceDisplay price={data.pricing?.basePrice} currency="VND" size="sm" label="Từ " />
          <span className="text-[10px] text-gray-400">/ngày</span>
        </div>
      </div>
    </div>
  );
}
