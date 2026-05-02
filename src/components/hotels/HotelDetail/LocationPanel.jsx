"use client";

import GoogleMap from "@/components/shared/GoogleMap";
import Card from "@/components/shared/Card";
import SectionHeading from "@/components/shared/SectionHeading";

/**
 * LocationPanel — Hiển thị bản đồ + địa chỉ khách sạn.
 * @param {{ hotel: Object }} props
 */
export default function LocationPanel({ hotel }) {
  const hasMap = hotel.map?.lat && hotel.map?.lng;

  return (
    <div className="space-y-6">
      {/* Map */}
      {hasMap && (
        <Card className="overflow-hidden !p-0">
          <div className="aspect-[16/9] md:aspect-[21/9]">
            <GoogleMap lat={hotel.map.lat} lng={hotel.map.lng} zoom={hotel.map.zoom || 15} />
          </div>
        </Card>
      )}

      {/* Address */}
      <Card>
        <SectionHeading>
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Địa chỉ
        </SectionHeading>
        {hotel.address && (
          <p className="text-gray-700">
            {[hotel.address.street, hotel.address.city, hotel.address.country].filter(Boolean).join(", ")}
          </p>
        )}
        {hotel.phone && (
          <p className="text-sm text-gray-500 mt-2">
            📞 <a href={`tel:${hotel.phone.replace(/[^0-9]/g, "")}`} className="hover:text-primary">{hotel.phone}</a>
          </p>
        )}
        {hotel.email && (
          <p className="text-sm text-gray-500 mt-1">
            ✉️ <a href={`mailto:${hotel.email}`} className="hover:text-primary">{hotel.email}</a>
          </p>
        )}
      </Card>
    </div>
  );
}
