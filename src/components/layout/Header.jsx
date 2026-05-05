/**
 * Header - Thanh điều hướng chính toàn cục.
 * Hiển thị logo, menu, search, mini cart, user menu.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { SITE } from "@/lib/constants";

const logoImg = "/images/favicon.webp";

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = items?.length || 0;

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
      {/* Top bar */}
      <div className="bg-blue-600 text-white text-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href={`tel:+84${SITE.phone.substring(1)}`} className="hover:text-blue-200 transition-colors">📞 {SITE.phone}</a>
            <a href={`mailto:${SITE.email}`} className="hover:text-blue-200 transition-colors">✉️ {SITE.email}</a>
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
            <span className="font-bold text-xl text-gray-900 hidden sm:block">{SITE.name}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Trang chủ
            </Link>
            <Link href="/tours" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Tour
            </Link>
            <Link href="/hotels" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Khách sạn
            </Link>
            <Link href="/activities" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              Hoạt động
            </Link>
            <Link href="/search" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              🔍
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <button
              className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
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
                  className="flex items-center gap-2 p-2 text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden md:inline text-sm">{user.email?.split("@")[0]}</span>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                    <Link href="/account/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                      Tài khoản
                    </Link>
                    <Link href="/account/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                      Lịch sử đặt
                    </Link>
                    <Link href="/account/wishlist" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsUserMenuOpen(false)}>
                      Yêu thích
                    </Link>
                    <hr className="my-1" />
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Đăng nhập
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden p-2 text-gray-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              {isMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <nav className="lg:hidden pb-4 border-t border-gray-100 pt-3">
            <Link href="/" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
            <Link href="/tours" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Tour</Link>
            <Link href="/hotels" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Khách sạn</Link>
            <Link href="/activities" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Hoạt động</Link>
            <Link href="/search" className="block py-2 text-gray-700 hover:text-blue-600" onClick={() => setIsMenuOpen(false)}>Tìm kiếm</Link>
          </nav>
        )}

        {/* Cart dropdown */}
        {isCartOpen && (
          <div className="absolute right-4 top-16 w-80 bg-white rounded-lg shadow-xl border border-gray-100 p-4 z-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Giỏ hàng ({cartCount})</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {cartCount === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Giỏ hàng trống</p>
            ) : (
              <>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-3 py-2 border-b border-gray-50">
                    <div className="w-14 h-14 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">
                      Ảnh
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.serviceTitle}</p>
                      <p className="text-xs text-gray-500">{item.serviceType}</p>
                      <p className="text-sm text-blue-600 font-semibold">{item.total?.toLocaleString()}₫</p>
                    </div>
                  </div>
                ))}
                <Link
                  href="/checkout"
                  className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg mt-3 text-sm font-medium hover:bg-blue-700 transition-colors"
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