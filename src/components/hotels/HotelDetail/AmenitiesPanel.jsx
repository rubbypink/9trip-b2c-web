/**
 * AmenitiesPanel — Hiển thị toàn bộ tiện nghi khách sạn dạng grid.
 * @param {{ hotel: Object }} props
 */
export default function AmenitiesPanel({ hotel }) {
  const amenities = hotel.amenities || [];

  if (amenities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có thông tin tiện nghi.</p>
      </div>
    );
  }

  // Group amenities by category (simple heuristic)
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
          <div key={cat} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {cat === "Tiện nghi chung" && "🏠"}
              {cat === "Giải trí" && "🎯"}
              {cat === "Dịch vụ" && "🛎️"}
              {cat === "Khác" && "📋"}
              {cat}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 p-2 rounded-lg bg-gray-50">
                  <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
