/**
 * LatestNews / BlogPosts — Section hiển thị bài viết mới nhất.
 * Hiển thị dạng grid card với ảnh, tiêu đề, excerpt, ngày đăng.
 *
 * @param {{ posts: Array<{id: string, title: string, slug: string, excerpt: string, featuredImage?: string, createdAt: {toDate: Function}}> }} props
 */
export default function LatestNews({ posts }) {
  if (!posts || posts.length === 0) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Tin tức & Bí kíp Du lịch
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Cập nhật những thông tin du lịch mới nhất, mẹo vặt và câu chuyện từ cộng đồng 9Trip
          </p>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.slice(0, 3).map((post) => (
            <a
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 bg-white"
            >
              {/* Image */}
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={post.featuredImage || "/placeholder-blog.jpg"}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Date */}
                <p className="text-xs text-gray-400 mb-2">
                  {formatDate(post.createdAt)}
                </p>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>

                {/* Read more */}
                <span className="inline-block mt-3 text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                  Đọc tiếp →
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            Xem tất cả bài viết
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}