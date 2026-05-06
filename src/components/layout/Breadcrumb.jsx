/**
 * Breadcrumb - Đường dẫn phân cấp.
 * @param {{ items: Array<{ label: string, href?: string }> }} props
 */
import Link from "next/link";

export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="bg-muted border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-muted-foreground">/</span>}
              {item.href && idx < items.length - 1 ? (
                <Link href={item.href} className="text-muted-foreground hover:text-blue-600 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={idx === items.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}