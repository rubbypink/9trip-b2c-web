import Link from "next/link";

/**
 * BlogNotFound — 404 page for blog posts.
 */
export default function BlogNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Bài viết không tồn tại</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Rất tiếc, bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Quay lại danh sách Blog
      </Link>
    </div>
  );
}
