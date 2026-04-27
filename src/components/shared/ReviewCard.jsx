"use client";

import Image from "next/image";
import { formatDate } from "@/lib/utils";

/**
 * ReviewCard — Hiển thị 1 đánh giá của khách hàng.
 * Dùng chung cho Hotels, Tours, Activities.
 *
 * Features:
 * - Avatar + tên người dùng
 * - Star rating (1-5)
 * - Ngày viết review
 * - Nội dung review
 * - Hình ảnh review (optional)
 * - Tags (VD: "Sạch sẽ", "Vị trí tốt")
 *
 * @param {{
 *   review: {
 *     id?: string,
 *     userName?: string,
 *     userAvatar?: string,
 *     rating?: number,
 *     title?: string,
 *     content?: string,
 *     images?: string[],
 *     tags?: string[],
 *     createdAt?: string,
 *   },
 *   showImages?: boolean,
 *   compact?: boolean,
 * }} props
 */
export default function ReviewCard({ review, showImages = true, compact = false }) {
  const {
    userName = "Ẩn danh",
    userAvatar,
    rating = 0,
    title,
    content,
    images = [],
    tags = [],
    createdAt,
  } = review;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {userAvatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={userAvatar}
                alt={userName}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + Date */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{userName}</span>
            {createdAt && (
              <span className="text-xs text-gray-400">{formatDate(createdAt, "short")}</span>
            )}
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? "text-yellow-400" : "text-gray-200"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Title */}
          {title && (
            <h4 className="font-medium text-gray-800 mt-2 text-sm">{title}</h4>
          )}

          {/* Content */}
          {content && (
            <p className={`text-gray-600 mt-1 ${compact ? "text-sm line-clamp-3" : "text-sm"}`}>
              {content}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Images */}
          {showImages && images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
                >
                  <Image
                    src={img}
                    alt={`Review image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
