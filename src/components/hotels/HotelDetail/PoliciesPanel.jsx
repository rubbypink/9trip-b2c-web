/**
 * PoliciesPanel — Chính sách khách sạn: check-in/out, hủy phòng, trẻ em, thú cưng, thuế.
 * @param {{ hotel: Object }} props
 */
import Card from "@/components/shared/Card";
import SectionHeading from "@/components/shared/SectionHeading";
import React from "react";

function PoliciesPanel({ hotel }) {
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
      <Card className="p-10 text-center text-muted">
        <p>Chưa có thông tin chính sách.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const content = policies[section.key];
        if (!content) return null;
        return (
          <Card key={section.key}>
            <SectionHeading>
              <span>{section.icon}</span>
              {section.label}
            </SectionHeading>
            <div
              className="prose max-w-none text-gray-700 text-sm"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </Card>
        );
      })}
    </div>
  );
}

export default React.memo(PoliciesPanel);
