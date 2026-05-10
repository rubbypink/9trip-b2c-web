import { adminDb } from '@/lib/firebase-admin';
import { mockTestimonials } from '@/lib/mockData';

/**
 * Serialize Firestore doc to plain object — local helper since serializeDoc is module-private.
 * @param {import("firebase-admin/firestore").DocumentSnapshot} snap
 * @returns {{ id: string, [key: string]: any }}
 */
function serializeDoc(snap) {
	const data = snap.data();
	const result = { id: snap.id };
	for (const [key, value] of Object.entries(data)) {
		// Convert Firestore Admin Timestamps to ISO strings
		if (value && typeof value === 'object' && 'toDate' in value) {
			result[key] = value.toDate().toISOString();
		} else {
			result[key] = value;
		}
	}
	return result;
}

const MAX_REVIEWS = 6;

/**
 * Testimonials — Server component hiển thị đánh giá từ khách hàng.
 * Fetch approved reviews từ Firestore (Admin SDK), sau đó bổ sung mock data
 * vào cuối danh sách nếu chưa đủ MAX_REVIEWS items.
 */
export default async function Testimonials() {
	let reviews = [];
	try {
		const snap = await adminDb.collection('reviews')
			.where('status', '==', 'approved')
			.where('rating', '>=', 4)
			.orderBy('rating', 'desc')
			.orderBy('createdAt', 'desc')
			.limit(8)
			.get();
		reviews = snap.docs.map((d) => serializeDoc(d));
	} catch (error) {
		// Firestore unavailable — fallback to mock data
	}

	const remaining = Math.max(0, MAX_REVIEWS - reviews.length);
	reviews = [...reviews, ...mockTestimonials.slice(0, remaining)];

	if (!reviews || reviews.length === 0) return null;

	return (
		<section className="py-8 lg:py-10 bg-surface-1">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="text-center mb-8">
					<span className="text-purple-600 font-semibold text-sm uppercase tracking-wider">Đánh giá</span>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Khách hàng nói gì về chúng tôi</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Hàng nghìn khách hàng đã tin tưởng và có những trải nghiệm tuyệt vời cùng 9 Trip Phú Quốc.</p>
				</div>

				{/* Reviews Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{reviews.slice(0, MAX_REVIEWS).map((review) => (
						<div
							key={review.id}
							className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
						>
							{/* Stars */}
							<div className="flex gap-1 mb-4">
								{[1, 2, 3, 4, 5].map((star) => (
									<svg
										key={star}
										className={`w-5 h-5 ${star <= (review.rating || 0) ? 'text-yellow-400' : 'text-border'}`}
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
								))}
							</div>

							{/* Content */}
							<p className="text-muted-foreground leading-relaxed mb-4 line-clamp-4">&ldquo;{review.comment || review.content || review.text || 'Dịch vụ tuyệt vời!'}&rdquo;</p>

							{/* Service name if available */}
							{review.serviceName && <p className="text-xs text-blue-600 font-medium mb-3">{review.serviceName}</p>}

							{/* Author */}
							<div className="flex items-center gap-3 pt-4 border-t border-border">
								<div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
									{(review.userName || review.displayName || 'A')[0].toUpperCase()}
								</div>
								<div>
									<p className="font-semibold text-foreground text-sm">{review.userName || review.displayName || 'Khách hàng'}</p>
									<p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
