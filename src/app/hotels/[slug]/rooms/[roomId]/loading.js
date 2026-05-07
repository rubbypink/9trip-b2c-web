/**
 * RoomDetailLoading — Skeleton loading cho trang chi tiết phòng.
 */
export default function RoomDetailLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Gallery skeleton */}
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div className="aspect-[4/3] md:aspect-[16/10] bg-muted" />
            <div className="hidden md:grid grid-cols-2 gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-muted" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          {/* Content skeleton */}
          <div className="flex-1 space-y-6">
            <div className="h-8 w-2/3 bg-muted rounded" />
            <div className="h-4 w-1/3 bg-muted rounded" />
            <div className="flex gap-4">
              <div className="h-10 w-32 bg-muted rounded-lg" />
              <div className="h-10 w-40 bg-muted rounded-lg" />
            </div>
            <div className="bg-card rounded-xl border border-border p-6 space-y-3">
              <div className="h-5 w-1/4 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
              <div className="h-4 w-4/6 bg-muted rounded" />
            </div>
          </div>

          {/* Sidebar skeleton */}
          <aside className="lg:w-96 flex-shrink-0">
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-5 space-y-4">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded-lg" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
