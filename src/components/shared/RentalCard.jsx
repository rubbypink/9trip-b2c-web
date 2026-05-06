/**
 * RentalCard - Card hiển thị dịch vụ cho thuê khác.
 */
import Link from "next/link";
import Image from "next/image";
import PriceDisplay from "./PriceDisplay";
import { BLUR_DATA_URL } from "@/lib/constants";

export default function RentalCard({ rental, item }) {
  const data = rental || item;
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/rentals/${data.slug}`} className="block relative aspect-[4/3] overflow-hidden" data-service-type="rental" data-service-id={data.id}>
        <Image
          src={data.images?.[0] || "/placeholder-rental.jpg"}
          alt={data.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <span className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold px-2 py-1 rounded">
          {data.type}
        </span>
      </Link>
      <div className="p-4">
        <Link href={`/rentals/${data.slug}`} className="font-semibold text-foreground hover:text-primary-600 line-clamp-2 mb-1 min-h-[2.5rem]">
          {data.name}
        </Link>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">📍 {data.location || "Phú Quốc"}</p>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <PriceDisplay price={data.pricing?.basePrice} currency="VND" size="sm" label="Từ " />
          <Link href={`/rentals/${data.slug}`} className="text-xs font-medium text-primary-600 hover:underline">
            Xem thêm
          </Link>
        </div>
      </div>
    </div>
  );
}
