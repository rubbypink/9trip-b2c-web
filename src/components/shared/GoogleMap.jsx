/**
 * GoogleMap - Hiển thị bản đồ Google Maps với marker.
 * @param {{ lat: number, lng: number, zoom?: number, className?: string, height?: string }} props
 */
"use client";

import { useEffect, useRef, useState } from "react";

export default function GoogleMap({ lat, lng, zoom = 14, className = "", height = "300px" }) {
  const mapRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lng) {
      setError(true);
      return;
    }
    // Sử dụng Google Maps Embed API không cần API key
    // Nếu có API key, có thể dùng Google Maps JavaScript API
    setError(false);
  }, [lat, lng]);

  if (error || !lat || !lng) {
    return (
      <div className={`bg-gray-200 rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: height }}>
        <p className="text-gray-400 text-sm">Không có dữ liệu bản đồ</p>
      </div>
    );
  }

  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed&hl=vi`;

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <iframe
        ref={mapRef}
        src={embedUrl}
        width="100%"
        height={height}
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location Map"
        className="rounded-lg"
      />
    </div>
  );
}