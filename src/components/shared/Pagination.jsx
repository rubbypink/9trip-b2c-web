/**
 * Pagination component.
 * @param {{ currentPage: number, totalPages: number, onPageChange: Function, className?: string }} props
 */
"use client";

export default function Pagination({ currentPage = 1, totalPages = 1, onPageChange, className = "" }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav className={`flex items-center justify-center gap-1 ${className}`} aria-label="Phân trang">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Trước
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="w-10 h-10 rounded-lg text-sm text-muted-foreground hover:bg-surface-2">1</button>
          {start > 2 && <span className="px-1 text-muted-foreground">...</span>}
        </>
      )}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
            page === currentPage
              ? "bg-blue-600 text-white"
              : "text-muted-foreground hover:bg-surface-2"
          }`}
        >
          {page}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-muted-foreground">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="w-10 h-10 rounded-lg text-sm text-muted-foreground hover:bg-surface-2">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Sau →
      </button>
    </nav>
  );
}