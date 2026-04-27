/**
 * @description Component hiển thị khi không có dữ liệu
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {icon ? (
        <div className="mb-4 text-5xl text-gray-300">{icon}</div>
      ) : (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      {title && (
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      )}
      {description && (
        <p className="mb-6 max-w-md text-sm text-gray-500">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}