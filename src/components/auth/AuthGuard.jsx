"use client";

import { useAuth } from "@/lib/auth";
import Link from "next/link";

/**
 * Bảo vệ route yêu cầu đăng nhập (Client-side hydration guard).
 *
 * Proxy.js (edge) đã redirect unauthenticated users về /login trước khi HTML
 * đến client. AuthGuard chỉ còn nhiệm vụ render loading skeleton trong khi
 * Firebase Auth state hydrate để tránh flash unauthenticated content.
 *
 * @param {{ children: React.ReactNode, fallback?: React.ReactNode }} props
 */
export default function AuthGuard({ children, fallback }) {
  const { user, loading, initialized } = useAuth();

  if (loading || !initialized) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-orange-600" />
            <p className="mt-4 text-muted-foreground text-sm">Đang kiểm tra đăng nhập...</p>
          </div>
        </div>
      )
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8 bg-card rounded-2xl shadow-sm border border-border max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-foreground mb-2">Bạn cần đăng nhập</h2>
          <p className="text-muted-foreground mb-6">Vui lòng đăng nhập để xem trang này.</p>
          <Link href="/login" className="inline-block bg-orange-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-colors w-full">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
