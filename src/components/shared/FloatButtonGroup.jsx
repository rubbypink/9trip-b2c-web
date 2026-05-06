"use client";

import { useState } from "react";

/**
 * FloatButtonGroup — Nút float cố định góc phải dưới màn hình.
 * Khi click mở rộng hiển thị 3 nút con: Zalo, Messenger, Chatbot.
 */
export default function FloatButtonGroup() {
  const [isOpen, setIsOpen] = useState(false);

  const buttons = [
    {
      label: "Zalo",
      href: "https://zalo.me/0877901901",
      bg: "bg-primary-500 hover:bg-primary-600",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 48 48" fill="currentColor">
          <path d="M15 36V12h18v24H15z" />
          <text x="24" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Z</text>
        </svg>
      ),
    },
    {
      label: "Messenger",
      href: "https://m.me/0877901901",
      bg: "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.25 5.55 3.23 7.32V22l3.2-1.78c1.1.32 2.27.5 3.57.5 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm1.11 12.55l-2.56-2.73-4.98 2.73 5.5-5.84 2.55 2.73 5-2.73-5.5 5.84z" />
        </svg>
      ),
    },
    {
      label: "Chatbot",
      href: "#",
      bg: "bg-green-500 hover:bg-green-600",
      onClick: (e) => {
        e.preventDefault();
        // Open chatbot — fallback to Messenger
        window.open("https://m.me/0877901901", "_blank", "noopener,noreferrer");
      },
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Sub-buttons */}
      <div
        className={`flex flex-col gap-3 transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {buttons.map((btn) =>
          btn.onClick ? (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className={`${btn.bg} text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110`}
              title={btn.label}
              aria-label={btn.label}
            >
              {btn.icon}
            </button>
          ) : (
            <a
              key={btn.label}
              href={btn.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn.bg} text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110`}
              title={btn.label}
              aria-label={btn.label}
            >
              {btn.icon}
            </a>
          )
        )}
      </div>

      {/* Main toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
          isOpen
            ? "bg-muted-foreground hover:bg-foreground rotate-45"
            : "bg-primary hover:bg-primary-dark"
        }`}
        aria-label={isOpen ? "Đóng" : "Hỗ trợ"}
        title={isOpen ? "Đóng" : "Hỗ trợ"}
      >
        {isOpen ? (
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
