import Image from 'next/image';
import StarRating from '@/components/shared/StarRating';
import PriceDisplay from '@/components/shared/PriceDisplay';
import { formatDate } from '@9trip/shared/utils';

/** ĐANG KHÔNG SỬ DỤNG - DEAD CODE
 * TourHeader — header cho trang chi tiết tour.
 * Hiển thị gallery, title, rating, location, duration, price.
 *
 * @param {{ tour: object }} props
 */
export default function TourHeader({ tour }) {
	const { title, featuredImage, gallery = [], ratingAverage = 0, ratingCount = 0, viewCount = 0, locationName, location = locationName, duration = {}, durationDays, pricing = {}, isFeatured, excerpt } = tour;

	const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;

	const durDays = duration.days || durationDays || 0;
	const durationText = durDays ? `${durDays} ngày ${duration.nights || durDays - 1 || 0} đêm` : duration.unit === 'hour' ? `${durDays || 0} giờ` : '';

	const discountPct = pricing.discount > 0 && pricing.adultPrice ? Math.round((pricing.discount / pricing.adultPrice) * 100) : pricing.discountPercent || 0;

	const hasMeta = !!location || !!durationText;

	return (
		<div className="bg-background">
			{/* Gallery — Banner Carousel */}
			<div className="relative mx-auto max-w-[1400px] px-4">
				<div className="rounded-xl overflow-hidden">
					{allImages.length > 0 ? (
						<div className="relative">
							<div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide">
								{allImages.map((img, idx) => (
									<div
										key={idx}
										className="min-w-full snap-start aspect-[21/9] relative flex-shrink-0"
									>
										<Image
											src={img}
											alt={`${title} - ${idx + 1}`}
											fill
											className="object-cover"
											priority={idx === 0}
											sizes="(max-width: 1400px) 100vw, 1400px"
										/>
									</div>
								))}
							</div>
							{allImages.length > 1 && (
								<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
									{allImages.map((_, idx) => (
										<div
											key={idx}
											className="w-2 h-2 rounded-full bg-background/70 shadow-sm"
										/>
									))}
								</div>
							)}
						</div>
					) : (
						<div className="aspect-[21/9] bg-muted flex items-center justify-center">
							<span className="text-muted-foreground text-lg">Chưa có ảnh</span>
						</div>
					)}
				</div>

				{/* Badges */}
				{isFeatured && <span className="absolute top-3 left-3 rounded bg-primary px-3 py-1 text-xs font-medium text-white">Nổi bật</span>}
				{discountPct > 0 && <span className="absolute top-3 left-24 rounded bg-red-500 px-3 py-1 text-xs font-medium text-white">Giảm {discountPct}%</span>}
			</div>

			{/* Title & Meta */}
			<div className="max-w-7xl mx-auto px-4 pt-6">
				<h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{title}</h1>

				<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
					<StarRating
						rating={ratingAverage}
						showCount
						reviewCount={ratingCount}
					/>
					{viewCount > 0 && <span>{viewCount.toLocaleString('vi-VN')} lượt xem</span>}
				</div>

				<div className={`flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2 ${hasMeta ? '' : 'hidden'}`}>
					{location && (
						<span className="inline-flex items-center gap-1">
							<svg
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							{location}
						</span>
					)}
					{durationText && (
						<span className="inline-flex items-center gap-1">
							<svg
								className="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							{durationText}
						</span>
					)}
				</div>

				{excerpt && <p className="text-muted-foreground mt-3 line-clamp-2">{excerpt}</p>}
			</div>
		</div>
	);
}
