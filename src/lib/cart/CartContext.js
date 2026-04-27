"use client";

import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from "react";

/**
 * @typedef {Object} CartItem
 * @property {string} id - Unique cart item ID (generated)
 * @property {string} productId - Firestore document ID
 * @property {'tour'|'hotel'|'activity'|'car'|'rental'} productType
 * @property {number} quantity - Number of guests/rooms/units
 * @property {number} price - Unit price at time of adding
 * @property {string} [date] - Selected date (ISO string)
 * @property {string} [variantKey] - Variant identifier (e.g. "adult", "child", "roomType")
 * @property {Object} meta - Additional info: title, image, location, duration, etc.
 */

/** @type {CartItem[]} */
const initialState = [];

function getStoredCart() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("9trip_cart");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * @param {CartItem[]} state
 * @param {{ type: string; payload: any }} action
 * @returns {CartItem[]}
 */
function cartReducer(state, action) {
  switch (action.type) {
    case "SET_CART":
      return action.payload;
    case "ADD_ITEM": {
      const item = action.payload;
      // Check if same product+variant+date already exists
      const existingIndex = state.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.productType === item.productType &&
          i.variantKey === item.variantKey &&
          i.date === item.date
      );
      if (existingIndex >= 0) {
        const updated = [...state];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
        };
        return updated;
      }
      return [...state, { ...item, id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }];
    }
    case "REMOVE_ITEM":
      return state.filter((i) => i.id !== action.payload);
    case "UPDATE_QUANTITY": {
      const { id, quantity } = action.payload;
      if (quantity <= 0) return state.filter((i) => i.id !== id);
      return state.map((i) => (i.id === id ? { ...i, quantity } : i));
    }
    case "CLEAR_CART":
      return [];
    default:
      return state;
  }
}

const CartContext = createContext(null);

/**
 * CartProvider — wraps app with cart state from localStorage.
 * Exposes: cart, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, itemCount
 */
export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState, getStoredCart);

  // Persist to localStorage on cart change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("9trip_cart", JSON.stringify(cart));
    }
  }, [cart]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "9trip_cart" && e.newValue) {
        try {
          dispatch({ type: "SET_CART", payload: JSON.parse(e.newValue) });
        } catch { /* ignore parse errors */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addItem = useCallback((item) => dispatch({ type: "ADD_ITEM", payload: item }), []);
  const removeItem = useCallback((id) => dispatch({ type: "REMOVE_ITEM", payload: id }), []);
  const updateQuantity = useCallback((id, quantity) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } }), []);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const totalItems = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

  const value = useMemo(
    () => ({ cart, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }),
    [cart, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** @returns {ReturnType<typeof useCartValue>} */
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}