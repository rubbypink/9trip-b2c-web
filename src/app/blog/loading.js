/**
 * Blog List Loading UI — skeleton grid hiển thị khi trang blog đang load (ISR).
 */
export default function BlogListLoading() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-8 bg-muted rounded-lg w-32 animate-pulse mb-2" />
          <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden border border-border">
              <div className="aspect-video bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-muted rounded w-full animate-pulse" />
                <div className="h-3 bg-muted rounded w-5/6 animate-pulse" />
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}