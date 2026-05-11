"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Bảo vệ route yêu cầu đăng nhập.
 * Chuyển hướng sang /login nếu chưa xác thực.
 * @param {{ children: React.ReactNode, fallback?: React.ReactNode }} props
 */
export default function AuthGuard({ children, fallback }) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [initialized, loading, user, router, pathname]);

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