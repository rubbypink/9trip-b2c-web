"use client";

/**
 * Activity Detail Error Boundary — hiển thị khi có lỗi ở trang chi tiết hoạt động.
 * @param {{ error: Error, reset: () => void }} props
 */
export default function ActivityDetailError({ error, reset }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-muted px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Đã xảy ra lỗi</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Không thể tải thông tin hoạt động. Vui lòng thử lại.
        </p>
        <p className="text-muted-foreground text-xs mb-6 font-mono">
          {error?.message || "Lỗi không xác định"}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary text-white font-medium px-6 py-2.5 hover:bg-primary-dark transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
