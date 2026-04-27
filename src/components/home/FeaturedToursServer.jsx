import dynamic from "next/dynamic";

const FeaturedTours = dynamic(() => import("@/components/home/FeaturedTours"), {
  loading: () => (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mx-auto h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mt-3 h-5 w-96 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow">
              <div className="aspect-[4/3] w-full rounded-xl bg-gray-200" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="flex justify-between">
                  <div className="h-5 w-20 rounded bg-gray-200" />
                  <div className="h-5 w-16 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  ),
});

export default function FeaturedToursServer() {
  return <FeaturedTours />;
}