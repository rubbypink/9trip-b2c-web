/**
 * Card — Shared card container primitive.
 * Thin wrapper providing consistent border, background, padding, and rounded corners.
 *
 * @param {{
 *   children: React.ReactNode,
 *   className?: string,
 *   as?: string,
 * }} props
 */
export default function Card({ children, className = "", as: Component = "div" }) {
  return (
    <Component className={`bg-card rounded-2xl border border-border p-6 shadow-sm ${className}`}>
      {children}
    </Component>
  );
}
