import ImageCarousel from "@/components/shared/ImageCarousel";

/**
 * HotelHeader — header cho trang chi tiết khách sạn.
 * Hiển thị image carousel gallery, tên, sao, địa chỉ, excerpt, review score badge.
 *
 * @param {{ hotel: object }} props
 */
export default function HotelHeader({ hotel }) {
  const {
    name,
    featuredImage,
    gallery = [],
    starRating = 0,
    address = {},
    excerpt,
    rating,
  } = hotel;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;
  const avgRating = rating?.average || 0;
  const totalRating = rating?.count || 0;

  // Score label
  const getScoreLabel = (score) => {
    if (score >= 9) return "Tuyệt vời";
    if (score >= 8) return "Rất tốt";
    if (score >= 7) return "Tốt";
    if (score >= 6) return "Khá";
    return "Trung bình";
  };

  return (
    <div className="bg-white">
      {/* Image Carousel Gallery */}
      <div className="relative mx-4 mt-4 rounded-xl overflow-hidden max-h-[420px]">
        <ImageCarousel
          images={allImages}
          alt={name}
          aspectRatio="aspect-[16/9] md:aspect-[21/9]"
          showOverlay={true}
          serviceId={hotel.id}
          serviceType="hotel"
        />

        {/* Star badge — overlay top-left */}
        {starRating > 0 && (
          <span className="absolute top-3 left-3 z-10 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-yellow-600 shadow-sm flex items-center gap-1">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {starRating} sao
          </span>
        )}

        {/* Score badge — overlay top-right */}
        {avgRating > 0 && (
          <div className="absolute top-3 right-3 z-10 flex flex-col items-center rounded-xl bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm">
            <span className="text-lg font-bold text-primary">{avgRating.toFixed(1)}</span>
            <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{getScoreLabel(avgRating)}</span>
          </div>
        )}
      </div>

      {/* Title & Meta */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{name}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {address.city && (
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {[address.street, address.city, address.country].filter(Boolean).join(", ")}
            </div>
          )}
          {avgRating > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-gray-300">|</span>
              <svg className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{avgRating.toFixed(1)} ({totalRating} đánh giá)</span>
            </div>
          )}
        </div>

        {excerpt && (
          <p className="text-gray-600 mt-3 line-clamp-2 max-w-2xl">{excerpt}</p>
        )}
      </div>
    </div>
  );
}
