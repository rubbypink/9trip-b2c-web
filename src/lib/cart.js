/**
 * Cart state management using React Context.
 * Supports multi-item cart, coupon application, real-time price calculation.
 */
"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { validateCoupon } from "./firestore";

const CartContext = createContext(null);

/**
 * @typedef {Object} CartItem
 * @property {string} serviceId
 * @property {string} serviceType - 'tour' | 'hotel_room' | 'activity' | 'car'
 * @property {string} serviceTitle
 * @property {string} featuredImage
 * @property {*} startDate - Timestamp or ISO string
 * @property {*} endDate - Timestamp or ISO string (for hotel)
 * @property {number} adults
 * @property {number} children
 * @property {number} infants
 * @property {number} rooms - Number of rooms (for hotel)
 * @property {number} basePrice - Unit price
 * @property {number} discount - Discount amount per unit
 * @property {number} total - Line total
 * @property {string} currency
 */

/**
 * @typedef {Object} CartState
 * @property {CartItem[]} items
 * @property {string|null} couponCode
 * @property {number} couponDiscount
 * @property {Object|null} couponData
 */

/**
 * CartProvider wraps checkout-related pages.
 * @param {{ children: React.ReactNode }} props
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [couponCode, setCouponCode] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState(null);

  /**
   * Add item to cart. If the same serviceId+startDate exists, replace it.
   * @param {CartItem} item
   */
  const addItem = useCallback((item) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.serviceId === item.serviceId && i.startDate === item.startDate
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = item;
        return copy;
      }
      return [...prev, item];
    });
    // Reset coupon when cart changes
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Remove item from cart by index.
   * @param {number} index
   */
  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Update quantity for a cart item by index.
   * Recalculates total based on unit price × new quantity.
   * @param {number} index
   * @param {number} newQuantity
   */
  const updateItemQuantity = useCallback((index, newQuantity) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        const item = copy[index];
        const qty = Math.max(1, Math.min(10, newQuantity));
        const unitPrice = item.basePrice || 0;
        copy[index] = { ...item, rooms: qty, total: unitPrice * qty };
      }
      return copy;
    });
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Clear the entire cart.
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  /**
   * Apply a coupon code.
   * @param {string} code
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const applyCoupon = useCallback(async (code) => {
    if (!code) return { success: false, message: "Vui lòng nhập mã giảm giá" };
    const coupon = await validateCoupon(code);
    if (!coupon) return { success: false, message: "Mã giảm giá không hợp lệ hoặc đã hết hạn" };

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    if (coupon.minSpend && subtotal < coupon.minSpend) {
      return { success: false, message: `Đơn tối thiểu ${coupon.minSpend.toLocaleString()} để áp dụng mã này` };
    }

    let discount = 0;
    if (coupon.type === "percent") {
      discount = subtotal * (coupon.amount / 100);
    } else {
      discount = coupon.amount;
    }
    discount = Math.min(discount, subtotal);

    setCouponCode(code);
    setCouponDiscount(discount);
    setCouponData(coupon);
    return { success: true, message: `Đã áp dụng mã, giảm ${discount.toLocaleString()}` };
  }, [items]);

  /**
   * Remove applied coupon.
   */
  const removeCoupon = useCallback(() => {
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponData(null);
  }, []);

  // Derived values
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const itemCount = items.length;
  const taxRate = 0.1; // 10% default, can be overridden from settings
  const tax = useMemo(() => (subtotal - couponDiscount) * taxRate, [subtotal, couponDiscount]);
  const grandTotal = useMemo(() => subtotal - couponDiscount + tax, [subtotal, couponDiscount, tax]);

  const value = {
    items,
    itemCount,
    couponCode,
    couponDiscount,
    couponData,
    subtotal,
    tax,
    grandTotal,
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Hook to access cart context.
 * @returns {CartState & {
 *   itemCount: number,
 *   subtotal: number,
 *   tax: number,
 *   grandTotal: number,
 *   addItem: Function,
 *   removeItem: Function,
 *   clearCart: Function,
 *   applyCoupon: Function,
 *   removeCoupon: Function,
 * }}
 */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/**
 * Compute total price for a single booking item.
 * @param {number} adultPrice
 * @param {number} childPrice
 * @param {number} infantPrice
 * @param {number} adults
 * @param {number} children
 * @param {number} infants
 * @param {number} discountPercent - Discount percentage (0-100)
 * @returns {{ baseTotal: number, discountAmount: number, finalTotal: number }}
 */
export function calcBookingPrice(adultPrice, childPrice, infantPrice, adults, children, infants, discountPercent = 0) {
  const baseTotal = adultPrice * adults + childPrice * children + infantPrice * infants;
  const discountAmount = baseTotal * (discountPercent / 100);
  const finalTotal = baseTotal - discountAmount;
  return { baseTotal, discountAmount, finalTotal };
}