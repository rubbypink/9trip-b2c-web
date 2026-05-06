/**
 * CarCard - Card hiển thị dịch vụ thuê xe.
 */
import Link from "next/link";
import Image from "next/image";
import PriceDisplay from "./PriceDisplay";
import StarRating from "./StarRating";
import { BLUR_DATA_URL } from "@/lib/constants";

export default function CarCard({ car, item }) {
  const data = car || item;
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/cars/${data.slug}`} className="block relative aspect-[16/10] overflow-hidden" data-service-type="car" data-service-id={data.id}>
        <Image
          src={data.images?.[0] || "/placeholder-car.jpg"}
          alt={data.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <span className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-foreground text-xs font-semibold px-2 py-1 rounded">
          {data.carType}
        </span>
      </Link>
      <div className="p-4">
        <Link href={`/cars/${data.slug}`} className="font-semibold text-foreground hover:text-primary-600 line-clamp-1 mb-1">
          {data.name}
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">💺 {data.seats} chỗ</span>
          <span className="flex items-center gap-1">⚙️ {data.transmission === 'automatic' ? 'Tự động' : 'Số sàn'}</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={data.ratingAverage} size="xs" />
          <span className="text-xs text-muted-foreground">({data.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <PriceDisplay price={data.pricing?.basePrice} currency="VND" size="sm" label="Từ " />
          <span className="text-[10px] text-muted-foreground">/ngày</span>
        </div>
      </div>
    </div>
  );
}
