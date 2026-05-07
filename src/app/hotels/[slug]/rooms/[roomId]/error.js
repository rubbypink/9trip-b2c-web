"use client";

/**
 * RoomDetailError — Error boundary cho trang chi tiết phòng.
 * Hiển thị khi có lỗi trong quá trình fetch hoặc render.
 * @param {{ error: Error, reset: () => void }} props
 */
export default function RoomDetailError({ error, reset }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Không thể tải trang</h2>
        <p className="text-muted-foreground mb-6">
          Đã xảy ra lỗi khi tải thông tin phòng. Vui lòng thử lại.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
