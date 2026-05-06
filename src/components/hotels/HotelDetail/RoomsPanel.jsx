"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart";

/**
 * RoomImageWithLightbox — Main thumbnail that opens GalleryWithLightbox on click.
 * @param {{ images: string[], roomName: string, featuredImage: string }} props
 */
function RoomImageWithLightbox({ images = [], roomName, featuredImage }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = featuredImage ? [featuredImage, ...images] : images;
  const displayImage = allImages.length > 0 ? allImages[0] : null;

  return (
    <>
      <div 
        className="relative w-full aspect-video md:aspect-[4/3] bg-muted cursor-pointer group"
        onClick={() => {
          if (allImages.length > 0) {
            setLightboxIndex(0);
            setLightboxOpen(true);
          }
        }}
      >
        {displayImage ? (
          <>
            <Image
              src={displayImage}
              alt={roomName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 300px"
            />
            {allImages.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                1/{allImages.length}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Chưa có ảnh
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && allImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-3xl hover:text-muted-foreground z-10"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-muted-foreground z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + allImages.length) % allImages.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-muted-foreground z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % allImages.length);
                }}
              >
                ›
              </button>
            </>
          )}
          <div className="relative w-full max-w-4xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <Image src={allImages[lightboxIndex]} alt={`${roomName} gallery ${lightboxIndex + 1}`} fill className="object-contain" sizes="80vw" />
          </div>
          {allImages.length > 1 && (
            <div className="absolute bottom-4 text-white text-sm">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * RoomCollapsibleInfo — Collapsible section showing room details.
 * @param {{ room: Object }} props
 */
function RoomCollapsibleInfo({ room }) {
  const [open, setOpen] = useState(false);

  const hasExtraInfo = room.roomSize > 0 || room.description || (room.amenities && room.amenities.length > 0);

  if (!hasExtraInfo) return null;

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-muted-foreground">Chi tiết phòng</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-3 text-sm animate-fadeIn">
          {room.roomSize > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-base">📐</span>
              <span><strong>Diện tích:</strong> {room.roomSize} m²</span>
            </div>
          )}
          {room.description && (
            <div className="text-muted-foreground text-xs leading-relaxed">
              <strong className="text-foreground">Mô tả:</strong>
              <div className="mt-1" dangerouslySetInnerHTML={{ __html: room.description }} />
            </div>
          )}
          {room.amenities && room.amenities.length > 0 && (
            <div>
              <strong className="text-foreground text-xs">Tiện nghi phòng:</strong>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {room.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[11px] bg-blue-50 text-blue-700 rounded-full px-2.5 py-1"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
          {room.included && room.included.length > 0 && (
            <div>
              <strong className="text-foreground text-xs">Bao gồm:</strong>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {room.included.map((inc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[11px] bg-green-50 text-green-700 rounded-full px-2.5 py-1"
                  >
                    ✓ {inc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RoomsPanel — Bảng giá phòng với gallery, collapse info, quantity selector, sync cart.
 * Hỗ trợ cả room active và inactive (isActive=false: mờ, block selection).
 * Sắp xếp theo sortOrder từ pricingTable (đã sort trong buildRoomPricingTable).
 *
 * @param {{
 *   pricingTable: Array<{
 *     roomId: string, roomName: string, totalRooms: number, maxGuests: number,
 *     bedType: string, roomSize: number, description: string,
 *     amenities: string[], included: string[], featuredImage: string,
 *     gallery: string[], isActive: boolean, sortOrder: number,
 *     rateTypes: Array<{
 *       rateType: string, avgSellPrice: number,
 *       dailyPrices: Array<{date: string, sellPrice: number, costPrice: number}>
 *     }>
 *   }>,
 *   hotel: Object,
 *   checkIn: string,
 *   checkOut: string,
 *   nights: number,
 * }} props
 */
export default function RoomsPanel({ pricingTable = [], hotel = {}, checkIn = "", checkOut = "", nights = 1 }) {
  const router = useRouter();
  const { addItem, updateCartItem, removeCartItemByKey, items: cartItems } = useCart();

  // State: quantity cho mỗi room × rateType (key: "roomId_rateType")
  const [quantities, setQuantities] = useState({});

  /**
   * Thay đổi số lượng cho 1 room + rate type.
   * @param {string} roomId
   * @param {string} rateType
   * @param {number} delta
   */
  const updateQuantity = useCallback((roomId, rateType, delta) => {
    const key = `${roomId}_${rateType}`;
    setQuantities((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [key]: next };
    });
  }, []);

  /**
   * Tổng tiền cho 1 room × rate type (chỉ tính active rooms).
   */
  const getLineTotal = useCallback((roomId, rateType, sellPrice) => {
    const key = `${roomId}_${rateType}`;
    const qty = quantities[key] || 0;
    return sellPrice * nights * qty;
  }, [quantities, nights]);

  /**
   * Tổng tiền tất cả selections từ active rooms.
   */
  const grandTotal = useMemo(() => {
    let total = 0;
    for (const room of pricingTable) {
      if (!room.isActive) continue;
      for (const rt of room.rateTypes) {
        total += getLineTotal(room.roomId, rt.rateType, rt.avgSellPrice);
      }
    }
    return total;
  }, [pricingTable, getLineTotal]);

  /**
   * Có ít nhất 1 selection từ active room.
   */
  const hasSelection = useMemo(() => {
    return Object.entries(quantities).some(([key, qty]) => qty > 0);
  }, [quantities]);

  /**
   * Restore quantities from existing cart items on mount.
   */
  useEffect(() => {
    const restored = { ...quantities };
    for (const room of pricingTable) {
      if (!room.isActive) continue;
      for (const rt of room.rateTypes) {
        const cartItem = cartItems.find(
          (ci) =>
            ci.serviceId === hotel.id &&
            ci.roomId === room.roomId &&
            ci.rateType === rt.rateType &&
            ci.startDate === checkIn
        );
        if (cartItem) {
          const key = `${room.roomId}_${rt.rateType}`;
          restored[key] = cartItem.rooms || 0;
        }
      }
    }
    setQuantities(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Xác nhận chọn phòng — đồng bộ selections với cart.
   */
  const handleConfirmSelection = useCallback(() => {
    try {
      for (const room of pricingTable) {
        if (!room.isActive) continue;
        for (const rt of room.rateTypes) {
          const key = `${room.roomId}_${rt.rateType}`;
          const qty = quantities[key] || 0;
          const lineTotal = getLineTotal(room.roomId, rt.rateType, rt.avgSellPrice);

          if (qty > 0) {
            updateCartItem({
              serviceId: hotel.id,
              roomId: room.roomId,
              rateType: rt.rateType,
              serviceType: "hotel_room",
              serviceTitle: `${hotel.name} — ${room.roomName}`,
              featuredImage: room.featuredImage || hotel.featuredImage || "",
              startDate: checkIn || new Date().toISOString(),
              endDate: checkOut || "",
              adults: 2,
              children: 0,
              infants: 0,
              rooms: qty,
              basePrice: rt.avgSellPrice,
              costPrice: rt.dailyPrices[0]?.costPrice || 0,
              discount: 0,
              total: lineTotal,
              currency: "VND",
              hotelId: hotel.id,
              hotelName: hotel.name,
              roomName: room.roomName,
            });
          } else {
            removeCartItemByKey({
              serviceId: hotel.id,
              roomId: room.roomId,
              rateType: rt.rateType,
              startDate: checkIn || new Date().toISOString(),
            });
          }
        }
      }
      router.push("/cart");
    } catch (error) {
      console.error('[RoomsPanel] Error confirming selection:', error.message);
    }
  }, [pricingTable, quantities, getLineTotal, updateCartItem, removeCartItemByKey, hotel, checkIn, checkOut, router]);

  if (pricingTable.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
        <svg className="h-12 w-12 mx-auto text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="font-medium text-foreground">Chưa có thông tin phòng</p>
        <p className="text-sm text-muted-foreground mt-1">Khách sạn này chưa cập nhật phòng. Vui lòng quay lại sau.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pricingTable.map((room) => {
        const isInactive = !room.isActive;

        return (
          <div
            key={room.roomId}
            className={`bg-card rounded-xl border overflow-hidden transition-all ${
              isInactive
                ? 'border-border opacity-60 grayscale-[0.3]'
                : 'border-border'
            }`}
          >
            {/* Room Header */}
            <div className={`p-5 border-b border-border ${isInactive ? 'bg-muted/50' : 'bg-muted/30'}`}>
              <div className="flex items-start gap-4">
                {/* Featured Image & Lightbox */}
                <div className={`w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 relative ${
                  isInactive ? 'grayscale opacity-60' : ''
                }`}>
                  <RoomImageWithLightbox
                    featuredImage={room.featuredImage}
                    images={room.gallery}
                    roomName={room.roomName}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {room.roomName}
                    </h4>
                    {isInactive && (
                      <span className="inline-flex items-center text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        🚫 Ngừng KD
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {room.bedType && (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        🛏️ {room.bedType}
                      </span>
                    )}
                    {room.maxGuests > 0 && (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        👤 Tối đa {room.maxGuests} khách
                      </span>
                    )}
                    {room.roomSize > 0 && (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        📐 {room.roomSize}m²
                      </span>
                    )}
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      📦 Còn {room.totalRooms} phòng
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Type Rows */}
            <div className="divide-y divide-border">
              {!isInactive && room.rateTypes.length > 0 ? (
                room.rateTypes.map((rt) => {
                  const key = `${room.roomId}_${rt.rateType}`;
                  const qty = quantities[key] || 0;
                  const lineTotal = getLineTotal(room.roomId, rt.rateType, rt.avgSellPrice);

                  return (
                    <div key={rt.rateType} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                      {/* Rate Type Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {rt.rateType.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {nights} đêm × {Math.round(rt.avgSellPrice).toLocaleString()}₫/đêm
                        </p>
                      </div>

                      {/* Unit Price */}
                      <div className="text-right w-28">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(rt.avgSellPrice, "VND")}
                        </p>
                        <p className="text-xs text-muted-foreground">/đêm</p>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(room.roomId, rt.rateType, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-foreground">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(room.roomId, rt.rateType, 1)}
                          disabled={qty >= room.totalRooms}
                          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right w-28">
                        <p className={lineTotal > 0 ? "text-sm font-bold text-primary" : "text-sm text-muted-foreground"}>
                          {lineTotal > 0 ? formatCurrency(lineTotal, "VND") : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={`p-4 text-sm text-center text-muted-foreground`}>
                  {isInactive ? 'Phòng tạm ngừng kinh doanh' : 'Chưa có giá cho ngày đã chọn'}
                </div>
              )}
            </div>

            {/* Collapsible Info — chỉ hiển thị cho active rooms */}
            {!isInactive && <RoomCollapsibleInfo room={room} />}
          </div>
        );
      })}

      {/* Sticky Bottom Bar — Confirm Selection */}
      {hasSelection && (
        <div className="sticky bottom-0 z-30 bg-background border-t border-border shadow-lg rounded-t-xl p-4 -mx-1">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div>
              <p className="text-xs text-muted-foreground">Tổng tạm tính</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal, "VND")}</p>
              <p className="text-xs text-muted-foreground">{nights} đêm</p>
            </div>
            <button
              type="button"
              onClick={handleConfirmSelection}
              className="rounded-xl bg-primary text-white font-semibold text-sm px-8 py-3 hover:bg-primary-dark transition-colors shadow-sm"
            >
              Xác nhận chọn phòng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
