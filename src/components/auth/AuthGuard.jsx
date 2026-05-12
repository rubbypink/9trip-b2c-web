"use client";

import { useAuth } from "@/lib/auth";

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

  if (loading || !initialized || !user) {
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

  return children;
}
