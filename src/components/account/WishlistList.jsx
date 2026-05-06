"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { getUserWishlist, removeFromWishlist } from "@/lib/firestore";
import { Heart, Trash2, MapPin, Star, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";

/**
 * WishlistList — displays user's saved tours/hotels with remove functionality.
 * @param {{}} _props - currently no external props needed; data comes from auth & firestore
 */
export default function WishlistList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const fetchWishlist = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      setItems([]);
      return;
    }
    try {
      setError(null);
      const data = await getUserWishlist(user.uid);
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      setError("Không thể tải danh sách yêu thích.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = useCallback(
    async (wishlistId) => {
      if (!user?.uid) return;
      setRemovingId(wishlistId);
      try {
        await removeFromWishlist(user.uid, wishlistId);
        setItems((prev) => prev.filter((item) => item.id !== wishlistId));
      } catch (err) {
        console.error("Failed to remove from wishlist:", err);
      } finally {
        setRemovingId(null);
      }
    },
    [user?.uid],
  );

  const formattedItems = useMemo(
    () =>
      (items || []).map((item) => {
        if (!item) return null;
        return {
          ...item,
          imageUrl: item?.imageUrl || item?.featuredImage || "/placeholder-tour.jpg",
          typeLabel: item?.type === "hotel" ? "Khách sạn" : item?.type === "activity" ? "Hoạt động" : "Tour",
          link:
            item?.type === "hotel"
              ? `/hotels/${item?.slug || item?.id}`
              : item?.type === "activity"
              ? `/activities/${item?.slug || item?.id}`
              : `/tours/${item?.slug || item?.id}`,
        };
      }).filter(Boolean),
    [items],
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Đang tải danh sách yêu thích">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex gap-4 bg-card rounded-xl border border-border p-4"
          >
            <div className="w-28 h-20 bg-muted rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
            <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16" role="alert">
        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={fetchWishlist}
          className="mt-3 text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (formattedItems.length === 0) {
    return (
      <div className="text-center py-16" role="status">
        <Heart className="w-16 h-16 text-border mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Danh sách yêu thích trống
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Hãy khám phá các tour du lịch và khách sạn, rồi nhấn biểu tượng trái tim để lưu vào đây.
        </p>
        <Link
          href="/tours"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md"
        >
          Khám phá ngay
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-1">
        {formattedItems.length} {formattedItems.length === 1 ? "mục" : "mục"} đã lưu
      </p>
      <ul className="space-y-3" role="list" aria-label="Danh sách yêu thích">
        {formattedItems.map((item) => (
          <li
            key={item.id}
            className="group flex gap-4 bg-card rounded-xl border border-border p-4 hover:border-cyan-200 hover:shadow-md transition-all duration-200"
          >
            {/* Image */}
            <Link
              href={item.link}
              className="w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={item.imageUrl}
                alt={item?.name || item?.title || "Hình ảnh"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item?.type === "hotel"
                        ? "bg-purple-100 text-purple-700"
                        : item?.type === "activity"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-cyan-100 text-cyan-700"
                    }`}
                  >
                    {item.typeLabel}
                  </span>
                  {item?.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      {item.rating}
                    </span>
                  )}
                </div>
                <Link href={item.link} className="block">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-cyan-600 transition-colors text-sm sm:text-base">
                    {item?.name || item?.title}
                  </h3>
                </Link>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {item?.location && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </span>
                )}
                {item?.savedAt && (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.savedAt.seconds ? item.savedAt.seconds * 1000 : item.savedAt).toLocaleDateString("vi-VN")}
                  </span>
                )}
              </div>
            </div>

            {/* Price & Actions */}
            <div className="flex flex-col items-end justify-between flex-shrink-0">
              {item?.price !== undefined && (
                <span className="font-bold text-cyan-600 text-sm">
                  {item.price.toLocaleString("vi-VN")} {item?.currency || "₫"}
                </span>
              )}
              <button
                onClick={() => handleRemove(item.id)}
                disabled={removingId === item.id}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Xóa ${item?.name || item?.title || "mục này"} khỏi danh sách yêu thích`}
                title="Xóa khỏi yêu thích"
              >
                {removingId === item.id ? (
                  <span className="block w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}