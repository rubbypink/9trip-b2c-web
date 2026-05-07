"use client";

import { useEffect } from "react";

/**
 * Hotels error boundary.
 */
export default function HotelsError({ error, reset }) {
  useEffect(() => {
    console.error("[Hotels] Error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Không thể tải danh sách khách sạn</h2>
        <p className="text-muted-foreground mb-6">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
