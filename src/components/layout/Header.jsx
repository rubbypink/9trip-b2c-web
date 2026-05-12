/**
 * Header - Thanh điều hướng chính toàn cục.
 * Hiển thị logo, menu, mini cart với qty controls, user menu.
 */
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { SITE } from "@9trip/shared/constants";
import ThemeToggle from "@/components/shared/ThemeToggle";

const logoImg = "/images/favicon.webp";

export default function Header() {
  const { user, logout } = useAuth();
  const { items, updateItemQuantity, removeItem, getCartItemsForDropdown } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartItems = getCartItemsForDropdown();
  const cartCount = items?.length || 0;

  /**
   * Handle quantity change for a cart item.
   * Hotels: changes rooms. Tours/activities: changes adults.
   * @param {number} idx - Cart item index
   * @param {number} delta - +1 or -1
   */
  const handleQtyChange = useCallback((idx, delta) => {
    const item = items[idx];
    if (!item) return;
    let newQty;
    if (item.serviceType === "hotel_room") {
      newQty = (item.rooms || 1) + delta;
    } else {
      newQty = (item.adults || 1) + delta;
    }
    if (newQty < 1) return;
    if (newQty > 10) return;
    updateItemQuantity(idx, newQty);
  }, [items, updateItemQuantity]);

  /**
   * Handle removing a cart item by index.
   * @param {number} idx - Cart item index
   */
  const handleRemoveItem = useCallback((idx) => {
    removeItem(idx);
  }, [removeItem]);

  return (
    <header className="sticky top-0 z-40 bg-background shadow-sm border-b border-border">
      {/* Top bar */}
      <div className="bg-primary-600 text-white text-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href={`tel:+84${SITE.phone.substring(1)}`} className="hover:text-primary-200 transition-colors">📞 {SITE.phone}</a>
            <a href={`mailto:${SITE.email}`} className="hover:text-primary-200 transition-colors">✉️ {SITE.email}</a>
          </div>
          <div className="flex items-center gap-3">
            <span>🌐 VN</span>
            <span>💰 VND</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src={logoImg}
              alt={SITE.name}
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-bold text-xl text-foreground hidden sm:block">{SITE.name}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-foreground hover:text-primary font-medium transition-colors">
              Trang chủ
            </Link>
            <Link href="/tours" className="text-foreground hover:text-primary font-medium transition-colors">
              Tour
            </Link>
            <Link href="/hotels" className="text-foreground hover:text-primary font-medium transition-colors">
              Khách sạn
            </Link>
            <Link href="/activities" className="text-foreground hover:text-primary font-medium transition-colors">
              Hoạt động
            </Link>
            <Link href="/blog" className="text-foreground hover:text-primary font-medium transition-colors">
              Blog
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Cart */}
            <button
              className="relative p-2 text-foreground hover:text-primary-600 transition-colors"
              onClick={() => setIsCartOpen(!isCartOpen)}
              aria-label="Giỏ hàng"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User menu */}
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 p-2 text-foreground hover:text-primary-600 transition-colors"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden md:inline text-sm">{user.email?.split("@")[0]}</span>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-2 z-50">
                    <Link href="/account/profile" className="block px-4 py-2 text-sm text-foreground hover:bg-surface-1" onClick={() => setIsUserMenuOpen(false)}>
                      Tài khoản
                    </Link>
                    <Link href="/account/bookings" className="block px-4 py-2 text-sm text-foreground hover:bg-surface-1" onClick={() => setIsUserMenuOpen(false)}>
                      Lịch sử đặt
                    </Link>
                    <Link href="/account/wishlist" className="block px-4 py-2 text-sm text-foreground hover:bg-surface-1" onClick={() => setIsUserMenuOpen(false)}>
                      Yêu thích
                    </Link>
                    <hr className="my-1" />
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-surface-1"
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                Đăng nhập
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <nav className="lg:hidden pb-4 border-t border-border pt-3">
            <Link href="/" className="block py-2 text-foreground hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
            <Link href="/tours" className="block py-2 text-foreground hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>Tour</Link>
            <Link href="/hotels" className="block py-2 text-foreground hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>Khách sạn</Link>
            <Link href="/activities" className="block py-2 text-foreground hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>Hoạt động</Link>
            <Link href="/blog" className="block py-2 text-foreground hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>Blog</Link>
          </nav>
        )}

        {/* Cart dropdown */}
        {isCartOpen && (
          <div className="absolute right-4 top-16 w-80 bg-card rounded-lg shadow-xl border border-border p-4 z-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-foreground">Giỏ hàng ({cartCount})</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-muted-foreground hover:text-muted-foreground">✕</button>
            </div>
            {cartCount === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Giỏ hàng trống</p>
            ) : (
              <>
                {cartItems.map((item, idx) => {
                  const qty = item.displayQuantity || 1;
                  const unitPrice = item.basePrice || 0;
                  const lineTotal = unitPrice * qty;
                  const isMinQty = qty <= 1;
                  return (
                    <div key={idx} className="flex gap-3 py-2 border-b border-border">
                      <div className="w-14 h-14 bg-muted rounded flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                        Ảnh
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.serviceTitle}</p>
                          <button
                            className="cart-item-remove flex-shrink-0 text-muted-foreground hover:text-red-500 transition-colors text-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                            onClick={() => handleRemoveItem(idx)}
                            aria-label="Xóa"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.serviceType === "hotel_room" ? "Khách sạn" : item.serviceType === "tour" ? "Tour" : item.serviceType === "activity" ? "Hoạt động" : item.serviceType}</p>
                        <div className="flex items-center justify-between mt-1">
                          <div className="cart-item-qty flex items-center gap-1">
                            <button
                              className={`w-6 h-6 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 flex items-center justify-center rounded border border-border text-sm transition-colors ${isMinQty ? "text-muted-foreground cursor-not-allowed" : "text-foreground hover:bg-surface-2"}`}
                              onClick={() => !isMinQty && handleQtyChange(idx, -1)}
                              disabled={isMinQty}
                              aria-label="Giảm số lượng"
                            >
                              −
                            </button>
                            <span className="text-sm font-medium text-foreground w-6 text-center">{qty}</span>
                            <button
                              className="w-6 h-6 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 flex items-center justify-center rounded border border-border text-sm text-foreground hover:bg-surface-2 transition-colors"
                              onClick={() => handleQtyChange(idx, 1)}
                              aria-label="Tăng số lượng"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-sm text-primary-600 font-semibold">{lineTotal.toLocaleString()}₫</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="/checkout"
                  className="block w-full text-center bg-primary-600 text-white py-2 rounded-lg mt-3 text-sm font-medium hover:bg-primary-700 transition-colors"
                  onClick={() => setIsCartOpen(false)}
                >
                  Thanh toán
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}