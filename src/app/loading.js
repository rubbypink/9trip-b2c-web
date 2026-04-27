/**
 * Global Loading UI — hiển thị khi route đang load.
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <p className="mt-4 text-gray-500 text-sm">Đang tải...</p>
      </div>
    </div>
  );
}
