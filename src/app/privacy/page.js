import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata = {
  title: "Chính sách bảo mật — 9 Trip Phú Quốc",
  description:
    "Chính sách bảo mật thông tin của 9 Trip Phú Quốc. Tìm hiểu cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.",
};

/**
 * PrivacyPage — Trang chính sách bảo mật.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Chính sách bảo mật" },
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            Chính sách bảo mật
          </h1>

          <div className="prose max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                1. Cam kết bảo mật
              </h2>
              <p>
                Công ty TNHH 9 Trip Phú Quốc (“chúng tôi”) cam kết bảo vệ quyền
                riêng tư của người dùng. Chính sách bảo mật này giải thích cách
                chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân
                của bạn khi sử dụng website 9tripphuquoc.com.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                2. Thông tin chúng tôi thu thập
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Thông tin cá nhân:</strong> Họ tên, email, số điện
                  thoại, địa chỉ khi bạn đăng ký tài khoản hoặc đặt dịch vụ.
                </li>
                <li>
                  <strong>Thông tin thanh toán:</strong> Dữ liệu giao dịch được
                  xử lý qua cổng thanh toán an toàn. Chúng tôi không lưu trữ
                  thông tin thẻ tín dụng.
                </li>
                <li>
                  <strong>Thông tin duyệt web:</strong> Địa chỉ IP, loại trình
                  duyệt, thời gian truy cập, các trang đã xem (thông qua
                  cookie).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                3. Mục đích sử dụng thông tin
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Xử lý đặt dịch vụ và thanh toán.</li>
                <li>Gửi thông tin xác nhận đặt dịch vụ và hỗ trợ khách hàng.</li>
                <li>Cải thiện trải nghiệm người dùng và chất lượng dịch vụ.</li>
                <li>
                  Gửi thông tin khuyến mãi (nếu bạn đồng ý nhận tin).
                </li>
                <li>Tuân thủ các nghĩa vụ pháp lý.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                4. Chia sẻ thông tin
              </h2>
              <p>
                Chúng tôi không bán, trao đổi hoặc cho thuê thông tin cá nhân
                của bạn cho bên thứ ba. Thông tin chỉ được chia sẻ trong các
                trường hợp:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Với đối tác cung cấp dịch vụ (khách sạn, công ty du lịch) để
                  thực hiện đặt dịch vụ của bạn.
                </li>
                <li>Với cổng thanh toán để xử lý giao dịch.</li>
                <li>Khi có yêu cầu từ cơ quan pháp luật có thẩm quyền.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                5. Bảo mật dữ liệu
              </h2>
              <p>
                Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù
                hợp để bảo vệ dữ liệu cá nhân khỏi truy cập trái phép, mất mát
                hoặc tiết lộ. Dữ liệu được lưu trữ trên hệ thống đám mây có bảo
                mật (Firebase / Google Cloud).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                6. Cookie
              </h2>
              <p>
                Website sử dụng cookie để lưu trữ tùy chọn người dùng, duy trì
                phiên đăng nhập và phân tích lưu lượng truy cập. Bạn có thể tắt
                cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có
                thể không hoạt động.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                7. Quyền của người dùng
              </h2>
              <p>Bạn có quyền:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Yêu cầu truy cập và chỉnh sửa thông tin cá nhân.</li>
                <li>Yêu cầu xóa tài khoản và dữ liệu liên quan.</li>
                <li>Từ chối nhận email quảng cáo.</li>
                <li>Khiếu nại về việc xử lý dữ liệu cá nhân.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                8. Thay đổi chính sách
              </h2>
              <p>
                Chính sách bảo mật có thể được cập nhật theo thời gian. Phiên
                bản mới nhất sẽ luôn được đăng tải tại trang này kèm theo ngày
                cập nhật.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                9. Liên hệ
              </h2>
              <p>
                Mọi câu hỏi về Chính sách bảo mật, vui lòng liên hệ:
              </p>
              <ul className="list-none pl-0 space-y-1">
                <li>
                  📧 Email:{" "}
                  <a
                    href="mailto:info@9tripphuquoc.com"
                    className="text-primary hover:underline"
                  >
                    info@9tripphuquoc.com
                  </a>
                </li>
                <li>📞 Điện thoại: 0877901901</li>
                <li>
                  📍 Địa chỉ: 17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An
                  Giang
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
