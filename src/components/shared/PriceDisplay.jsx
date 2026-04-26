/**
 * Hiển thị giá với discount badge.
 * @param {{ price: number, discount?: number, discountType?: string, currency?: string, perPerson?: boolean, className?: string }} props
 */
"use client";

import { formatCurrency } from "@/lib/utils";

export default function PriceDisplay({ price = 0, discount = 0, discountType = "percent", currency = "VND", perPerson = false, className = "" }) {
  const finalPrice = discount > 0
    ? (discountType === "percent" ? price * (1 - discount / 100) : price - discount)
    : price;

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      {discount > 0 && (
        <span className="text-sm text-gray-400 line-through">
          {formatCurrency(price, currency)}
        </span>
      )}
      <span className="text-xl font-bold text-orange-500">
        {formatCurrency(finalPrice, currency)}
      </span>
      {perPerson && <span className="text-sm text-gray-500">/ người</span>}
      {discount > 0 && (
        <span className="inline-block bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
          {discountType === "percent" ? `-${discount}%` : `-${formatCurrency(discount, currency)}`}
        </span>
      )}
    </div>
  );
}