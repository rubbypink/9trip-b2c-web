"use client";

import { useState } from "react";
import { cn } from "@9trip/shared/utils";

/**
 * ItineraryPanel — hiển thị lịch trình từng ngày dạng accordion.
 * @param {{ itinerary: Array<{title: string, description: string, activities: string[], image?: string}> }} props
 */
export default function ItineraryPanel({ itinerary = [] }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Chưa có thông tin lịch trình cho tour này.</p>
      </div>
    );
  }

  const toggleDay = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {itinerary.map((day, idx) => {
        const isExpanded = expandedIndex === idx;
        return (
          <div
            key={idx}
            className="rounded-xl border border-border overflow-hidden transition-shadow hover:shadow-sm"
          >
            <button
              onClick={() => toggleDay(idx)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors",
                isExpanded ? "bg-primary/5" : "bg-card hover:bg-surface-2"
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  isExpanded ? "bg-primary text-white" : "bg-muted text-foreground"
                )}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className={cn("font-semibold", isExpanded ? "text-primary" : "text-foreground")}>
                  Ngày {idx + 1}: {day.title || `Ngày ${idx + 1}`}
                </h4>
                {!isExpanded && day.activities?.length > 0 && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {day.activities.slice(0, 2).join(" • ")}
                  </p>
                )}
              </div>
              <svg
                className={cn(
                  "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5">
                {day.description && (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground mb-4"
                    dangerouslySetInnerHTML={{ __html: day.description }}
                  />
                )}
                {day.activities?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Hoạt động:</p>
                    <ul className="space-y-1.5">
                      {day.activities.map((activity, aIdx) => (
                        <li key={aIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <svg
                            className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {day.image && (
                  <div className="mt-4 relative aspect-video rounded-lg overflow-hidden">
                    <img
                      src={day.image}
                      alt={`Ngày ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}