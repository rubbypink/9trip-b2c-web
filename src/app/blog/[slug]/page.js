import { notFound } from "next/navigation";
import { getBlogBySlug, getRelatedBlogs } from "@/lib/firestore-admin";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage-admin";
import Breadcrumb from "@/components/layout/Breadcrumb";
import BlogDetail from "@/components/blog/BlogDetail";
import { logger } from "@/lib/logger";

export const revalidate = 3600; // ISR: revalidate sau 1h

/**
 * generateMetadata — dynamic metadata cho SEO.
 * Dùng title, excerpt, featuredImage từ blog để tạo meta tags.
 * @param {{ params: Promise<{ slug: string }> }} props
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { blog } = await getBlogBySlug(resolvedParams.slug);

  if (!blog) {
    return { title: "Bài viết không tìm thấy — 9 Trip" };
  }

  return {
    title: `${blog.title} — 9 Trip`,
    description: blog.excerpt || `Đọc bài viết ${blog.title} tại 9 Trip.`,
    alternates: { canonical: `/blog/${resolvedParams.slug}` },
    openGraph: {
      title: `${blog.title} — 9 Trip`,
      description: blog.excerpt || "",
      images: blog.featuredImage ? [{ url: blog.featuredImage, width: 1200, height: 630 }] : [],
      type: "article",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${blog.title} — 9 Trip`,
      description: blog.excerpt || "",
      images: blog.featuredImage ? [blog.featuredImage] : [],
    },
  };
}

/**
 * generateStaticParams — pre-build các blog phổ biến (tối ưu ISR).
 */
export async function generateStaticParams() {
  return [];
}

/**
 * Blog Detail Page — Server Component (ISR).
 * Hiển thị nội dung bài viết blog và các bài viết liên quan.
 *
 * URL: /blog/[slug]
 * @param {{ params: Promise<{ slug: string }> }} props
 */
export default async function BlogDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const { blog: rawBlog } = await getBlogBySlug(slug);
  if (!rawBlog) {
    notFound();
  }

  let rawRelatedBlogs = [];
  try {
    const relatedResult = await getRelatedBlogs(rawBlog.category, slug, 3);
    rawRelatedBlogs = relatedResult?.blogs || [];
  } catch (error) {
    logger.error('[BlogDetailPage] Error fetching related blogs:', error.message);
  }

  let blog = rawBlog;
  let relatedBlogs = [];
  try {
    [blog, relatedBlogs] = await Promise.all([
      resolveDocImages(rawBlog),
      resolveDocsImages(rawRelatedBlogs),
    ]);
  } catch (error) {
    logger.error('[BlogDetailPage] Error resolving images:', error.message);
  }

  // JSON-LD structured data for SEO (BlogPosting schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.excerpt || blog.content?.replace(/<[^>]*>/g, "").slice(0, 200),
    image: blog.featuredImage,
    url: `/blog/${slug}`,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    author: {
      "@type": "Person",
      name: blog.author || "9 Trip",
    },
  };

  return (
    <div className="min-h-screen bg-muted pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: blog.title, href: `/blog/${slug}` },
        ]}
      />

      <BlogDetail post={blog} relatedPosts={relatedBlogs} />
    </div>
  );
}
