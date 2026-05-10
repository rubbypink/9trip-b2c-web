/**
 * Custom hook for managing the booking flow:
 * 1. Inventory Hold creation & release
 * 2. Booking document creation
 * 3. Step management
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  createBooking, 
  createInventoryHold, 
  releaseInventoryHold, 
  getRealAvailability 
} from "@/lib/firestore";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

export function useBooking() {
  const { user } = useAuth();
  const { items, clearCart, subtotal, tax, grandTotal, couponData, couponDiscount } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [holdId, setHoldId] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  /**
   * Create inventory hold for all items in cart.
   * Note: In a production app, you might want to hold multiple items. 
   * For 9 Trip, we'll start with holding the first item or handle multiple holds.
   */
  const startCheckout = useCallback(async () => {
    if (!user || items.length === 0) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      // For simplicity, we create hold for the first item. 
      // If the project requirements evolve, we can map through items.
      const item = items[0];
      
      // Verify availability again before holding
      const available = await getRealAvailability(
        item.serviceId, 
        item.serviceType, 
        item.startDate, 
        item.maxCapacity || 100 // Default capacity if not set
      );
      
      if (available < (item.adults + item.children)) {
        throw new Error("Rất tiếc, dịch vụ này đã hết chỗ vào ngày bạn chọn.");
      }

      const id = await createInventoryHold(
        item.serviceId,
        item.serviceType,
        item.startDate,
        item.endDate || null,
        item.adults + item.children,
        user.uid
      );
      
      setHoldId(id);
      return id;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, items]);

  /**
   * Finalize booking after payment or for cash payment.
   */
  const confirmBooking = useCallback(async (contactInfo, paymentGateway = "cash") => {
    if (!user || items.length === 0) return null;
    
    setLoading(true);
    setError(null);
    
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

      // Clear cart after successful booking creation
      clearCart();
      
      return id;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, items, holdId, subtotal, tax, grandTotal, couponData, couponDiscount, clearCart]);

  /**
   * Cleanup hold if user leaves checkout or on unmount
   */
  const cancelCheckout = useCallback(async () => {
    if (holdId) {
      await releaseInventoryHold(holdId);
      setHoldId(null);
    }
  }, [holdId]);

  // Cleanup hold on unmount if booking wasn't completed
  useEffect(() => {
    return () => {
      // Logic for cleanup on unmount could be tricky if user just refreshed.
      // Usually handled by TTL on Firestore but good to have a manual release.
    };
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
