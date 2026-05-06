import { getPublishedBlogs } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import { logger } from "@/lib/logger";
import Breadcrumb from "@/components/layout/Breadcrumb";
import BlogCard from "@/components/blog/BlogCard";

export const metadata = {
  title: "Blog — 9 Trip",
  description: "Đọc các bài viết về du lịch, kinh nghiệm và hướng dẫn chi tiết.",
  openGraph: {
    title: "Blog — 9 Trip",
    description: "Đọc các bài viết về du lịch, kinh nghiệm và hướng dẫn chi tiết.",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
    type: "website",
    locale: "vi_VN",
  },
  alternates: { canonical: "/blog" },
};

export const revalidate = 3600;

/**
 * Blog List Page — Server Component (ISR).
 * Hiển thị danh sách bài viết blog đã xuất bản.
 */
export default async function BlogListPage() {
  let blogs = [];

  try {
    const { blogs: rawBlogs } = await getPublishedBlogs();
    blogs = await resolveDocsImages(rawBlogs);
  } catch (error) {
    logger.error("[BlogListPage] Error fetching blogs:", error.message);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Blog — 9 Trip",
    description: "Danh sách bài viết blog về du lịch.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com"}/blog`,
    numberOfItems: blogs.length,
    itemListElement: blogs.slice(0, 10).map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/blog/${b.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Blog", href: "/blog" },
        ]}
      />

      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Blog
          </h1>
          <p className="text-muted-foreground">
            Khám phá các bài viết về du lịch, kinh nghiệm và hướng dẫn chi tiết
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {blogs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">Chưa có bài viết</p>
            <p className="text-sm text-muted-foreground mt-2">
              Các bài viết sẽ sớm được cập nhật
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}