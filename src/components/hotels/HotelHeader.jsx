import Image from "next/image";

/**
 * HotelHeader — header cho trang chi tiết khách sạn.
 * Hiển thị gallery ảnh, tên, sao, địa chỉ, excerpt.
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
  } = hotel;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;

  return (
    <div className="bg-white">
      {/* Gallery Grid */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1 max-h-[480px] overflow-hidden rounded-xl mx-4 mt-4">
          {allImages.length > 0 ? (
            <>
              {/* Main image — spans 2 cols, 2 rows */}
              <div className="md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto relative" data-service-type="hotel" data-service-id={hotel.id}>
                <Image
                  src={allImages[0]}
                  alt={name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              {/* Secondary images */}
              {allImages[1] && (
                <div className="hidden md:block aspect-[4/3] relative">
                  <Image src={allImages[1]} alt={`${name} - 2`} fill className="object-cover" sizes="25vw" />
                </div>
              )}
              {allImages[2] && (
                <div className="hidden md:block aspect-[4/3] relative">
                  <Image src={allImages[2]} alt={`${name} - 3`} fill className="object-cover" sizes="25vw" />
                </div>
              )}
              {allImages[3] && (
                <div className="hidden md:block aspect-[4/3] relative">
                  <Image src={allImages[3]} alt={`${name} - 4`} fill className="object-cover" sizes="25vw" />
                </div>
              )}
            </>
          ) : (
            <div className="col-span-4 aspect-[21/9] bg-gray-200 rounded-xl flex items-center justify-center">
              <span className="text-gray-400 text-lg">Chưa có ảnh</span>
            </div>
          )}
        </div>

        {/* "View all photos" overlay */}
        {allImages.length > 4 && (
          <button className="absolute bottom-3 right-7 rounded-lg bg-black/60 text-white text-sm px-3 py-1.5 hover:bg-black/80 transition-colors">
            +{allImages.length - 4} ảnh
          </button>
        )}

        {/* Star badge */}
        {starRating > 0 && (
          <span className="absolute top-3 left-7 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-medium text-yellow-600 shadow-sm flex items-center gap-1">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {starRating} sao
          </span>
        )}
      </div>

      {/* Title & Meta */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{name}</h1>

        {address.city && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {[address.street, address.city, address.country].filter(Boolean).join(", ")}
          </div>
        )}

        {excerpt && (
          <p className="text-gray-600 mt-3 line-clamp-2 max-w-2xl">{excerpt}</p>
        )}
      </div>
    </div>
  );
}
