/**
 * Car Detail Loading UI — hiển thị khi trang chi tiết xe đang load (ISR).
 */
export default function CarDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {/* Gallery skeleton */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
              <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
            </div>
            {/* Title skeleton */}
            <div className="h-8 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            {/* Specs skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Sidebar skeleton */}
          <aside className="lg:w-96 flex-shrink-0">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse mb-4" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
