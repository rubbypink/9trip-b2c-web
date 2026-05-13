/**
 * Custom hook for managing the booking flow:
 * 1. Inventory Hold creation & release
 * 2. Booking document creation
 * 3. Step management
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import { createBooking } from "@/lib/firestore";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

/**
 * Retry a fetch request with exponential backoff.
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || attempt === maxRetries) return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }
    const delay = Math.pow(2, attempt) * 300;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export function useBooking() {
  const { user } = useAuth();
  const { items, clearCart, subtotal, tax, grandTotal, couponData, couponDiscount } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [holdId, setHoldId] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  const startCheckout = useCallback(async () => {
    setError(null);

    if (!user) {
      setError("Vui lòng đăng nhập để tiếp tục.");
      return null;
    }
    if (items.length === 0) {
      setError("Giỏ hàng trống. Vui lòng thêm dịch vụ.");
      return null;
    }
    
    setLoading(true);
    
    try {
      const item = items[0];
      
      const checkRes = await fetchWithRetry('/api/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: item.serviceId,
          serviceType: item.serviceType,
          startDate: item.startDate,
          roomId: item.roomId,
        }),
      });
      const checkData = await checkRes.json();
      if (!checkData.success || checkData.availability < (item.adults + item.children)) {
        throw new Error("Rất tiếc, dịch vụ này đã hết chỗ vào ngày bạn chọn.");
      }

      const holdRes = await fetchWithRetry('/api/availability/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: item.serviceId,
          serviceType: item.serviceType,
          startDate: item.startDate,
          endDate: item.endDate || null,
          quantity: item.adults + item.children,
          userId: user.uid,
          roomId: item.roomId,
        }),
      });
      const holdData = await holdRes.json();
      if (!holdData.success) throw new Error(holdData.message || 'Không thể giữ chỗ');
      const id = holdData.holdId;
      
      setHoldId(id);
      return id;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, items]);

  const confirmBooking = useCallback(async (contactInfo, paymentGateway = "cash") => {
    setError(null);

    if (!user) {
      setError("Vui lòng đăng nhập để tiếp tục.");
      return null;
    }
    if (items.length === 0) {
      setError("Giỏ hàng trống. Vui lòng thêm dịch vụ.");
      return null;
    }
    
    setLoading(true);
    
    try {
      const itemsObject = items.reduce((acc, currentItem, index) => {
        const id = currentItem.serviceId + "_" + index + "_" + Date.now();
        const isPaidOrDeposited = ['VNPAY', 'MOMO', 'PAYPAL', 'BANK_TRANSFER'].includes(paymentGateway);
        const policy = currentItem['cancel-policy'] || (isPaidOrDeposited ? 'non-refundable' : 'flexible');
        
        acc[id] = { ...currentItem, id, 'cancel-policy': policy };
        return acc;
      }, {});

      const bookingData = {
        userId: user.uid,
        items: itemsObject,
        contactInfo,
        gateway: paymentGateway,
        inventoryHoldId: holdId,
        couponCode: couponData?.code || null,
      };

      const id = await createBooking(bookingData);
      setBookingId(id);

      clearCart();
      
      return id;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, items, holdId, subtotal, tax, grandTotal, couponData, couponDiscount, clearCart]);

  const cancelCheckout = useCallback(async () => {
    if (holdId) {
      await fetch('/api/availability/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId }),
      });
      setHoldId(null);
    }
  }, [holdId]);

  useEffect(() => {
    return () => {};
  }, []);

  return {
    loading,
    error,
    holdId,
    bookingId,
    startCheckout,
    confirmBooking,
    cancelCheckout,
  };
}
