"use client";

export default function Badge({ icon, label, value, highlight }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
        highlight
          ? "bg-red-50 text-red-600 border border-red-200"
          : "bg-muted text-muted-foreground border border-border"
      }`}
    >
      {icon && (
        <span className="flex-shrink-0 w-4 h-4 bg-muted rounded-full flex items-center justify-center text-[8px]">
          {label === "Thời gian" && "🕐"}
          {label === "Địa điểm" && "📍"}
          {label === "Xuất phát" && "🚩"}
          {label === "Phương tiện" && "🚌"}
          {label === "Ưu đãi" && "🏷️"}
          {label === "Xếp hạng" && "⭐"}
          {label === "Đánh giá" && "🏆"}
          {label === "Giá" && "💰"}
          {label === "Giờ diễn" && "⏰"}
          {label === "Sức chứa" && "👥"}
        </span>
      )}
      <span>{value}</span>
    </div>
  );
}
