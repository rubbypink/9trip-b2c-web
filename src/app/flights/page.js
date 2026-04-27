import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata = {
  title: "Vé Máy Bay — 9Trip",
  description: "Dịch vụ vé máy bay của 9Trip đang được phát triển.",
};

/**
 * Flight Page — Placeholder page cho dịch vụ vé máy bay.
 * Sẽ được đối tác tích hợp sau.
 */
export default function FlightsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Vé máy bay", href: "/flights" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
            <svg
              className="w-10 h-10 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Vé Máy Bay
          </h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto mb-8">
            Dịch vụ vé máy bay đang được phát triển và sẽ sớm ra mắt.
            Vui lòng quay lại sau hoặc liên hệ với chúng tôi để được hỗ trợ.
          </p>

          {/* Contact info */}
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center justify-center text-sm text-gray-600">
            <a
              href="tel:0877901901"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              0877901901
            </a>
            <a
              href="mailto:info@9tripphuquoc.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              info@9tripphuquoc.com
            </a>
          </div>

          {/* Back to home */}
          <div className="mt-10">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay về trang chủ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
