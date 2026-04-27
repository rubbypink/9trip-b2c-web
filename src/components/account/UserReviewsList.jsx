"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getUserReviews, getDocById } from "@/lib/firestore";
import { Star, MessageSquare, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import Link from "next/link";

/**
 * Renders a list of reviews written by the current user.
 */
export default function UserReviewsList() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userReviews = await getUserReviews(user.uid);
      
      // Fetch service details for each review to display name
      const reviewsWithDetails = await Promise.all(
        userReviews.map(async (review) => {
          const collectionMap = {
            tour: 'tours',
            hotel: 'hotels',
            activity: 'activities',
          };
          const collectionName = collectionMap[review.serviceType] || `${review.serviceType}s`;
          const service = await getDocById(collectionName, review.serviceId);
          return {
            ...review,
            serviceName: service?.name || service?.title || "Dịch vụ không xác định",
            serviceLink: `/${review.serviceType}s/${service?.slug || review.serviceId}`,
          };
        })
      );
      
      setReviews(reviewsWithDetails);
    } catch (err) {
      console.error("Failed to fetch user reviews:", err);
      setError("Không thể tải các đánh giá của bạn.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);
  
  const statusInfo = {
    pending: { text: "Đang chờ duyệt", icon: Clock, color: "text-amber-500" },
    approved: { text: "Đã duyệt", icon: CheckCircle, color: "text-emerald-500" },
    rejected: { text: "Bị từ chối", icon: XCircle, color: "text-red-500" },
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-white p-5 rounded-xl border border-slate-100 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-3 bg-slate-100 rounded w-full"></div>
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 px-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl">
        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-1">Chưa có đánh giá nào</h3>
        <p className="text-sm text-slate-500">
          Sau khi hoàn thành một chuyến đi, bạn có thể chia sẻ trải nghiệm của mình tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white p-5 rounded-xl border border-slate-200/80 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <Link href={review.serviceLink} className="group">
                <h4 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                  {review.serviceName}
                </h4>
              </Link>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              {React.createElement(statusInfo[review.status]?.icon || AlertCircle, { className: `w-4 h-4 ${statusInfo[review.status]?.color}` })}
              <span className={`${statusInfo[review.status]?.color}`}>
                {statusInfo[review.status]?.text || "Không xác định"}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-slate-600 my-3 italic border-l-2 border-slate-200 pl-4 py-1">
            "{review.comment}"
          </p>

          <div className="text-xs text-slate-400">
            <span>Ngày viết: {new Date(review.createdAt).toLocaleDateString("vi-VN")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}