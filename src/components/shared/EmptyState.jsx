/**
 * EmptyState — Trạng thái rỗng khi không có dữ liệu để hiển thị.
 * @param {{ icon?: string, title?: string, message?: string, action?: React.ReactNode, className?: string }} props
 */
export default function EmptyState({
  icon = "📭",
  title = "Không có dữ liệu",
  message = "Hiện chưa có nội dung nào để hiển thị.",
  action,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <span className="text-5xl mb-4" role="img" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}