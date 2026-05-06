/**
 * Hiển thị giá với discount badge, hỗ trợ giá trẻ em.
 * @param {{
 *   price: number,
 *   discount?: number,
 *   discountType?: string,
 *   currency?: string,
 *   perPerson?: boolean,
 *   childPrice?: number,
 *   label?: string,
 *   size?: 'sm' | 'md',
 *   className?: string
 * }} props
 */
"use client";

import { formatCurrency } from "@/lib/utils";

export default function PriceDisplay({
  price = 0,
  discount = 0,
  discountType = "percent",
  currency = "VND",
  perPerson = false,
  childPrice,
  label,
  size = "md",
  className = "",
}) {
  const finalPrice = discount > 0
    ? (discountType === "percent" ? price * (1 - discount / 100) : price - discount)
    : price;

  const isSm = size === "sm";
  const priceClass = isSm ? "text-lg font-bold text-orange-500" : "text-xl font-bold text-orange-500";

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-2">
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
        {discount > 0 && (
          <span className={`text-muted-foreground line-through ${isSm ? "text-xs" : "text-sm"}`}>
            {formatCurrency(price, currency)}
          </span>
        )}
        <span className={priceClass}>
          {formatCurrency(finalPrice, currency)}
        </span>
        {perPerson && <span className="text-sm text-muted-foreground">/ người</span>}
        {discount > 0 && (
          <span className="inline-block bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
            {discountType === "percent" ? `-${discount}%` : `-${formatCurrency(discount, currency)}`}
          </span>
        )}
      </div>
      {childPrice > 0 && (
        <span className="text-xs text-muted-foreground mt-0.5">
          Trẻ em: {formatCurrency(childPrice, currency)}/người
        </span>
      )}
    </div>
  );
}