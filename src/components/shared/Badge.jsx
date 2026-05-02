import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  default: "bg-gray-50 border-gray-200 text-gray-600",
  primary: "bg-primary/10 border-primary/20 text-primary",
  success: "bg-green-50 border-green-200 text-green-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  danger: "bg-red-50 border-red-200 text-red-600",
  info: "bg-blue-50 border-blue-200 text-blue-700",
};

/**
 * Badge — Consistent inline badge/chip component for tags, statuses, labels.
 *
 * @param {{
 *   children: React.ReactNode,
 *   variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info',
 *   size?: 'sm' | 'md',
 *   className?: string,
 * }} props
 */
export default function Badge({ children, variant = "default", size = "md", className = "" }) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        sizeClass,
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
        className
      )}
    >
      {children}
    </span>
  );
}
