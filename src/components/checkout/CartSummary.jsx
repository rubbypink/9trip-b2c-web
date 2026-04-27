"use client";

import { useCart } from "@/lib/cart";
import { formatCurrency, formatDate } from "@/lib/utils";
import Image from "next/image";

/**
 * CartSummary component showing itemized list and totals.
 */
export default function CartSummary() {
  const { items, subtotal, tax, couponDiscount, grandTotal } = useCart();

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
        <h3 className="font-bold text-gray-900">Chi tiết đơn hàng</h3>
      </div>
      
      <div className="p-4 space-y-4">
        {items.map((item, idx) => (
          <div key={`${item.serviceId}-${idx}`} className="flex gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={item.featuredImage || "/placeholder-service.jpg"}
                alt={item.serviceTitle}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {item.serviceTitle}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(item.startDate)} {item.endDate ? ` - ${formatDate(item.endDate)}` : ""}
              </p>
              <div className="flex justify-between items-end mt-1">
                <span className="text-xs text-gray-500">
                  {item.adults} người lớn{item.children > 0 ? `, ${item.children} trẻ em` : ""}
                </span>
                <span className="text-sm font-bold text-primary-600">
                  {formatCurrency(item.total)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tạm tính</span>
          <span className="text-gray-900 font-medium">{formatCurrency(subtotal)}</span>
        </div>
        
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Giảm giá</span>
            <span>-{formatCurrency(couponDiscount)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Thuế (10%)</span>
          <span className="text-gray-900 font-medium">{formatCurrency(tax)}</span>
        </div>

        <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
          <span className="text-base font-bold text-gray-900">Tổng cộng</span>
          <span className="text-xl font-bold text-primary-600">{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
