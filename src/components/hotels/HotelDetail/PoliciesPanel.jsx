/**
 * PoliciesPanel — Chính sách khách sạn: check-in/out, hủy phòng, trẻ em, thú cưng, thuế.
 * @param {{ hotel: Object }} props
 */
export default function PoliciesPanel({ hotel }) {
  const policies = hotel.policies || {};
  const sections = [
    { key: "checkIn", label: "Nhận phòng", icon: "🕐" },
    { key: "checkOut", label: "Trả phòng", icon: "🕛" },
    { key: "cancellation", label: "Chính sách hủy", icon: "❌" },
    { key: "children", label: "Trẻ em & giường phụ", icon: "👶" },
    { key: "pets", label: "Thú cưng", icon: "🐾" },
    { key: "taxes", label: "Thuế & phí", icon: "💰" },
    { key: "notes", label: "Lưu ý khác", icon: "📝" },
  ];

  const hasAnyPolicy = sections.some((s) => policies[s.key]);

  if (!hasAnyPolicy) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có thông tin chính sách.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const content = policies[section.key];
        if (!content) return null;
        return (
          <div key={section.key} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>{section.icon}</span>
              {section.label}
            </h3>
            <div
              className="prose max-w-none text-gray-700 text-sm"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        );
      })}
    </div>
  );
}
