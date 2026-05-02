/**
 * SectionHeading — Consistent section title with optional icon.
 *
 * @param {{
 *   children: React.ReactNode,
 *   icon?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export default function SectionHeading({ children, icon, className = "" }) {
  return (
    <h3 className={`text-lg font-semibold text-foreground mb-4 flex items-center gap-2 ${className}`}>
      {icon && <span className="text-primary">{icon}</span>}
      {children}
    </h3>
  );
}
