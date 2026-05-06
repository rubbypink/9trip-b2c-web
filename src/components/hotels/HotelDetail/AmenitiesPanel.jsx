/**
 * AmenitiesPanel — Phân loại tiện nghi thành các nhóm (Facility categories).
 * @param {{ hotel: Object }} props
 */
import Card from "@/components/shared/Card";
import SectionHeading from "@/components/shared/SectionHeading";
import React from "react";

function AmenitiesPanel({ hotel }) {
  const amenities = hotel.amenities || [];

  if (amenities.length === 0) {
    return (
      <Card className="p-10 text-center text-muted">
        <p>Chưa có thông tin tiện nghi.</p>
      </Card>
    );
  }

  const categories = {
    "Tiện nghi chung": [],
    "Giải trí": [],
    "Dịch vụ": [],
    "Khác": [],
  };

  const categoryKeywords = {
    "Giải trí": ["hồ bơi", "pool", "spa", "gym", "phòng gym", "fitness", "karaoke", "bida", "game"],
    "Dịch vụ": ["đưa đón", "shuttle", "nhà hàng", "restaurant", "bar", "lễ tân", "giặt", "laundry", "giữ xe", "parking"],
    "Tiện nghi chung": ["wifi", "điều hòa", "tủ lạnh", "tv", "tivi", "máy lạnh", "nước nóng"],
  };

  for (const amenity of amenities) {
    const lower = amenity.toLowerCase();
    let assigned = false;
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        categories[cat].push(amenity);
        assigned = true;
        break;
      }
    }
    if (!assigned) categories["Khác"].push(amenity);
  }

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([cat, items]) =>
        items.length > 0 ? (
          <Card key={cat}>
            <SectionHeading>
              {cat === "Tiện nghi chung" && "🏠 "}
              {cat === "Giải trí" && "🎯 "}
              {cat === "Dịch vụ" && "🛎️ "}
              {cat === "Khác" && "📋 "}
              {cat}
            </SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-foreground p-2 rounded-lg bg-muted">
                  <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">{amenity}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null
      )}
    </div>
  );
}

export default React.memo(AmenitiesPanel);
