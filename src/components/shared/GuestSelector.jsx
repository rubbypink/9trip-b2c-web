/**
 * GuestSelector - Chọn số lượng khách (Adult, Child, Infant).
 * @param {{ adults: number, children: number, infants: number, onChange: Function, maxAdults?: number, maxChildren?: number, maxInfants?: number }} props
 */
"use client";

import { useState } from "react";

export default function GuestSelector({ adults = 1, children = 0, infants = 0, onChange, maxAdults = 50, maxChildren = 20, maxInfants = 10 }) {
  const [open, setOpen] = useState(false);

  const totalGuests = adults + children + infants;

  const handleChange = (type, delta) => {
    const current = { adults, children, infants };
    const next = current[type] + delta;
    const limits = { adults: [0, maxAdults], children: [0, maxChildren], infants: [0, maxInfants] };
    if (next < limits[type][0] || next > limits[type][1]) return;
    onChange(type, next);
  };

  const labels = { adults: "Người lớn", children: "Trẻ em", infants: "Em bé" };
  const ageLabels = { adults: "≥ 12 tuổi", children: "2-11 tuổi", infants: "< 2 tuổi" };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 border border-border rounded-lg bg-card text-left hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-foreground">
          {totalGuests} khách
        </span>
        <svg className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
          {(["adults", "children", "infants"]).map((type) => (
            <div key={type} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-sm font-medium text-foreground">{labels[type]}</div>
                <div className="text-xs text-muted-foreground">{ageLabels[type]}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange(type, -1)}
                  disabled={(type === "adults" && adults <= 1) || (type !== "adults" && { adults, children, infants }[type] <= 0)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-medium">{{ adults, children, infants }[type]}</span>
                <button
                  type="button"
                  onClick={() => handleChange(type, 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Xong
          </button>
        </div>
      )}
    </div>
  );
}