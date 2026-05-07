"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getUserBookings, findBookingsByEmail, findBookingsByPhone } from "@/lib/firestore";

/**
 * Detects whether a query string looks like an email address.
 * @param {string} value - The input string to check.
 * @returns {boolean} True if the value contains an @ symbol (treated as email).
 */
function isEmailLike(value) {
  return value.includes("@");
}

/**
 * Displays the current user's booking history grouped by status,
 * with an email/phone search filter above the list.
 * @param {Object} props
 * @param {Function} [props.onReviewRequest] - Callback when user wants to review a completed booking.
 */
export default function BookingsList({ onReviewRequest }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBookings, setFilteredBookings] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

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

  /**
   * Search bookings by email or phone based on input type.
   * If input contains "@" searches by email, otherwise by phone.
   */
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const results = isEmailLike(query)
        ? await findBookingsByEmail(query)
        : await findBookingsByPhone(query);
      setFilteredBookings(results);
    } catch {
      setFilteredBookings([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  /** Clear the search filter and return to the full bookings list. */
  const handleClearFilter = useCallback(() => {
    setSearchQuery("");
    setFilteredBookings(null);
  }, []);

  const displayBookings = filteredBookings !== null ? filteredBookings : bookings;
  const isFilterActive = filteredBookings !== null;

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

  // Group bookings by status for visual sections
  const upcoming = displayBookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const completed = displayBookings.filter((b) => b.status === "completed");
  const cancelled = displayBookings.filter((b) => b.status === "cancelled");

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Tìm theo email hoặc số điện thoại..."
          className="booking-search-input flex-1 px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-card text-foreground placeholder:text-muted-foreground"
          disabled={isSearching}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="booking-search-button shrink-0 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? "Đang tìm..." : "Tìm kiếm"}
        </button>
        {isFilterActive && (
          <button
            type="button"
            onClick={handleClearFilter}
            className="booking-clear-filter shrink-0 px-4 py-2.5 bg-muted text-muted-foreground text-sm font-medium rounded-lg hover:bg-surface-1/80 transition-colors"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {isFilterActive && displayBookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Không tìm thấy đặt phòng phù hợp</h3>
          <p className="text-sm text-muted-foreground">
            Thử tìm với email hoặc số điện thoại khác.
          </p>
        </div>
      ) : !bookings.length && !isFilterActive ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có đơn đặt tour nào</h3>
          <p className="text-sm text-muted-foreground">
            Khi bạn đặt tour, lịch sử sẽ hiển thị ở đây.
          </p>
        </div>
      ) : (
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
                      className="booking-item flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow"
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
      )}
    </div>
  );
}