"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/lib/cart/CartContext";

/**
 * AddToCartButton — adds a product to cart with optional variant selection.
 * @param {Object} props
 * @param {string} props.productId - Firestore doc ID
 * @param {'tour'|'hotel'|'activity'|'car'|'rental'} props.productType
 * @param {number} props.price - Unit price
 * @param {string} [props.date] - Selected date ISO string
 * @param {string} [props.variantKey] - Variant (e.g. "adult", "deluxe-room")
 * @param {number} [props.quantity=1]
 * @param {Object} props.meta - { title, image, location, duration }
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} [props.children] - Custom button content
 */
export default function AddToCartButton({
  productId,
  productType,
  price,
  date,
  variantKey,
  quantity = 1,
  meta = {},
  className = "",
  children,
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleAdd = useCallback(() => {
    if (!productId || !productType || price == null) return;

    addItem({
      productId,
      productType,
      price,
      date: date || null,
      variantKey: variantKey || null,
      quantity,
      meta,
    });

    setAdded(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    setTimeout(() => setAdded(false), 2000);
  }, [productId, productType, price, date, variantKey, quantity, meta, addItem]);

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all duration-200 ${
        animating ? "scale-95" : "scale-100"
      } ${
        added
          ? "bg-green-600 text-white hover:bg-green-700"
          : "bg-orange-600 text-white hover:bg-orange-700"
      } ${className}`}
      disabled={added}
    >
      {added ? (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Đã thêm vào giỏ
        </>
      ) : (
        children || (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Thêm vào giỏ
          </>
        )
      )}
    </button>
  );
}