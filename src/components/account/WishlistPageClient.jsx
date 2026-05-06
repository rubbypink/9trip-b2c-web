"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import WishlistList from "@/components/account/WishlistList";

export default function WishlistPageClient() {
  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Danh sách yêu thích
          </h1>
          <p className="text-muted-foreground mt-1">
            Tour và khách sạn bạn đã lưu để theo dõi sau.
          </p>
        </div>
        <WishlistList />
      </div>
    </AuthGuard>
  );
}