"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getUserBookings } from "@/lib/firestore";

/**
 * Displays the current user's booking history grouped by status.
 * On click of a completed booking opens a review modal.
 */
export default function BookingsList({ onReviewRequest }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const data = await getUserBookings(user.uid);
        if (!cancelled) setBookings(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Không thể tải lịch sử đặt tour.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
        {error}
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có đơn đặt tour nào</h3>
        <p className="text-sm text-muted-foreground">
          Khi bạn đặt tour, lịch sử sẽ hiển thị ở đây.
        </p>
      </div>
    );
  }

  // Group bookings by status for visual sections
  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const statusBadge = (status) => {
    const map = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
      completed: "bg-blue-100 text-blue-700 border-blue-200",
      cancelled: "bg-muted text-muted-foreground border-border",
    };
    const labels = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      completed: "Đã hoàn thành",
      cancelled: "Đã hủy",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-10">
      {[
        { title: "Sắp tới", items: upcoming },
        { title: "Đã hoàn thành", items: completed },
        { title: "Đã hủy", items: cancelled },
      ]
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <section key={group.title}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{group.title}</h3>
            <div className="space-y-4">
              {group.items.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground truncate">
                        {booking.tourName || booking.productName || "Tour"}
                      </h4>
                      {statusBadge(booking.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      {booking.date && <span>📅 {booking.date}</span>}
                      {booking.guests && <span>👥 {booking.guests} khách</span>}
                      {booking.total != null && (
                        <span className="font-medium text-foreground">
                          💰 {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(booking.total)}
                        </span>
                      )}
                    </div>
                  </div>
                  {booking.status === "completed" && onReviewRequest && (
                    <button
                      type="button"
                      onClick={() => onReviewRequest(booking)}
                      className="shrink-0 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      ✍️ Viết đánh giá
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}