/**
 * EmptyState - Hiển thị khi không có dữ liệu.
 * @param {{ icon?: React.ReactNode, title?: string, description?: string, action?: React.ReactNode, className?: string }} props
 */
export default function EmptyState({ icon, title = "Không tìm thấy", description = "Không có dữ liệu phù hợp với tìm kiếm của bạn.", action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {icon || (
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <h3 className="text-lg font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}