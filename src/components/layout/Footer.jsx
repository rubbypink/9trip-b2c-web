/**
 * Footer - Chân trang toàn cục.
 */
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                9T
              </div>
              <span className="font-bold text-xl text-white">9Trip</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Nền tảng đặt Tour du lịch & Khách sạn trực tuyến hàng đầu Việt Nam. Khám phá những điểm đến tuyệt vời với giá tốt nhất.
            </p>
            <div className="flex gap-3 mt-4">
              <span className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-sm cursor-pointer hover:bg-blue-600 transition-colors">FB</span>
              <span className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-sm cursor-pointer hover:bg-blue-600 transition-colors">IG</span>
              <span className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-sm cursor-pointer hover:bg-blue-600 transition-colors">YT</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tours" className="hover:text-blue-400 transition-colors">Tour du lịch</Link></li>
              <li><Link href="/hotels" className="hover:text-blue-400 transition-colors">Khách sạn</Link></li>
              <li><Link href="/activities" className="hover:text-blue-400 transition-colors">Hoạt động</Link></li>
              <li><Link href="/search" className="hover:text-blue-400 transition-colors">Tìm kiếm</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">Trung tâm trợ giúp</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">Chính sách hủy</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">Điều khoản sử dụng</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">Chính sách bảo mật</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Liên hệ</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span>📍</span> 123 Nguyễn Huệ, Q.1, TP.HCM
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span> +84 123 456 789
              </li>
              <li className="flex items-center gap-2">
                <span>✉️</span> info@9trip.vn
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          © 2026 9Trip. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}