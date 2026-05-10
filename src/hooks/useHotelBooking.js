'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';

/**
 * Build a composite cart key for a hotel room item.
 * @param {string} hotelId
 * @param {string} roomId
 * @param {string} rateType
 * @param {string} checkIn
 * @returns {string}
 */
function buildCartKey(hotelId, roomId, rateType, checkIn) {
	return `${hotelId}_${roomId}_${rateType}_${checkIn}`;
}

/**
 * useHotelBooking — Shared hook for hotel room pricing + quantity + cart sync.
 * Used by both RoomsPanel and HotelBookingWidget to avoid duplicated logic.
 *
 * @param {{
 *   pricingTable: Array<Object>,
 *   hotel: Object,
 *   checkIn: string,
 *   checkOut: string,
 *   nights: number,
 * }} params
 * @returns {{
 *   roomQuantities: Object,
 *   getLineTotal: (roomId: string, rateType: string) => number,
 *   grandTotal: number,
 *   setRoomQuantity: (roomId: string, rateType: string, delta: number, maxQty: number) => void,
 *   syncCart: () => void,
 *   handleBookNow: () => void,
 * }}
 */
export default function useHotelBooking({ pricingTable, hotel, checkIn, checkOut, nights }) {
	const router = useRouter();
	const { addItem, updateCartItem, removeCartItemByKey, items: cartItems } = useCart();
	const debounceRef = useRef(null);

	const [roomQuantities, setRoomQuantities] = useState({});

	/**
	 * Get line total for a specific room + rate type.
	 * @param {string} roomId
	 * @param {string} rateType
	 * @returns {number}
	 */
	const getLineTotal = useCallback(
		(roomId, rateType) => {
			const key = `${roomId}_${rateType}`;
			const qty = roomQuantities[key] || 0;
			if (qty === 0) return 0;
			const room = pricingTable.find((r) => r.roomId === roomId);
			if (!room) return 0;
			const rate = room.rateTypes.find((rt) => rt.rateType === rateType);
			if (!rate) return 0;
			return rate.avgSellPrice * qty * nights;
		},
		[pricingTable, roomQuantities, nights],
	);

	/**
	 * Grand total across all rooms and rate types.
	 */
	const grandTotal = useMemo(() => {
		let total = 0;
		for (const [key, qty] of Object.entries(roomQuantities)) {
			if (qty <= 0) continue;
			const [roomId, rateType] = key.split('_');
			total += getLineTotal(roomId, rateType);
		}
		return total;
	}, [roomQuantities, getLineTotal]);

	/**
	 * Set room quantity with bounds checking.
	 * @param {string} roomId
	 * @param {string} rateType
	 * @param {number} delta
	 * @param {number} maxQty
	 */
	const setRoomQuantity = useCallback((roomId, rateType, delta, maxQty) => {
		setRoomQuantities((prev) => {
			const key = `${roomId}_${rateType}`;
			const current = prev[key] || 0;
			const next = Math.max(0, Math.min(current + delta, maxQty));
			return next === current ? prev : { ...prev, [key]: next };
		});
	}, []);

	/**
	 * Sync cart with current quantities and pricing.
	 */
	const syncCart = useCallback(() => {
		if (!hotel?.id) return;

		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			for (const [key, qty] of Object.entries(roomQuantities)) {
				if (qty <= 0) {
					const cartKey = buildCartKey(hotel.id, key, '', checkIn);
					removeCartItemByKey(cartKey);
					continue;
				}

				const room = pricingTable.find((r) => `${r.roomId}_${r.rateTypes[0]?.rateType}` === key);
				if (!room) continue;

				const rate = room.rateTypes[0];
				if (!rate) continue;

				const cartKey = buildCartKey(hotel.id, room.roomId, rate.rateType, checkIn);

				if (cartItems.some((item) => buildCartKey(item.serviceId, item.roomId, item.rateType, item.startDate) === cartKey)) {
					updateCartItem(cartKey, { rooms: qty });
				} else {
					addItem({
						serviceId: hotel.id,
						serviceType: 'hotel_room',
						serviceTitle: `${hotel.name} — ${room.roomName}`,
						featuredImage: room.featuredImage || hotel.featuredImage,
						startDate: checkIn,
						endDate: checkOut,
						adults: room.maxGuests || 2,
						children: 0,
						infants: 0,
						rooms: qty,
						basePrice: rate.avgSellPrice,
						discount: 0,
						total: rate.avgSellPrice * qty * nights,
						currency: 'VND',
						roomId: room.roomId,
						rateType: rate.rateType,
					});
				}
			}
		}, 300);
	}, [roomQuantities, pricingTable, hotel, checkIn, checkOut, nights, cartItems, addItem, updateCartItem, removeCartItemByKey]);

	/**
	 * Handle "Book Now" — sync cart and navigate to checkout.
	 */
	const handleBookNow = useCallback(() => {
		syncCart();
		router.push('/checkout');
	}, [syncCart, router]);

	// Cleanup debounce on unmount
	useEffect(() => {
		return () => clearTimeout(debounceRef.current);
	}, []);

	return { roomQuantities, getLineTotal, grandTotal, setRoomQuantity, syncCart, handleBookNow };
}
