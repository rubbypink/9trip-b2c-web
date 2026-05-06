"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "@/lib/auth";
import { createReview } from "@/lib/firestore";

/**
 * ReviewModal component allows users to submit a review for a completed booking.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.booking - The booking object to be reviewed.
 * @param {Function} props.onClose - Function to close the modal.
 */
export default function ReviewModal({ booking, onClose }) {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu đánh giá",
        text: "Vui lòng chọn số sao đánh giá.",
      });
      return;
    }

    if (!comment.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Thiếu bình luận",
        text: "Vui lòng chia sẻ trải nghiệm của bạn.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const reviewData = {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || "Người dùng",
        userAvatar: profile?.photoURL || user.photoURL || null,
        serviceId: booking.serviceId || booking.tourId || booking.productId,
        serviceType: booking.serviceType || "tour",
        bookingId: booking.id,
        rating,
        comment,
        status: "pending", // Reviews need approval
      };

      await createReview(reviewData);

      await Swal.fire({
        icon: "success",
        title: "Cảm ơn bạn!",
        text: "Đánh giá của bạn đã được gửi và đang chờ duyệt.",
        confirmButtonColor: "#10b981",
      });

      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Không thể gửi đánh giá. Vui lòng thử lại sau.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Viết đánh giá</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Đánh giá cho:</p>
            <h4 className="font-semibold text-foreground">
              {booking.tourName || booking.productName || "Tour của bạn"}
            </h4>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-foreground">Bạn thấy thế nào?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground h-4">
              {rating === 5 && "Tuyệt vời!"}
              {rating === 4 && "Rất tốt"}
              {rating === 3 && "Bình thường"}
              {rating === 2 && "Kém"}
              {rating === 1 && "Rất kém"}
            </p>
          </div>

          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Chia sẻ trải nghiệm của bạn
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bạn thích điều gì nhất ở chuyến đi này?"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}