import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata = {
  title: "Chính sách hủy & hoàn tiền — 9 Trip Phú Quốc",
  description:
    "Chính sách hủy đặt dịch vụ và hoàn tiền của 9 Trip Phú Quốc. Tìm hiểu các điều kiện hủy tour, khách sạn và các dịch vụ khác.",
};

/**
 * CancellationPage — Trang chính sách hủy và hoàn tiền.
 */
export default function CancellationPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Chính sách hủy" },
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            Chính sách hủy & hoàn tiền
          </h1>

          <div className="prose max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                1. Quy định chung
              </h2>
              <p>
                Chính sách hủy và hoàn tiền này áp dụng cho tất cả dịch vụ được
                đặt qua website 9tripphuquoc.com, bao gồm tour du lịch, khách
                sạn, hoạt động trải nghiệm và thuê xe. Chính sách cụ thể cho
                từng dịch vụ được hiển thị trong quá trình đặt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                2. Chính sách hủy tour du lịch
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Hủy trước 7 ngày:</strong> Hoàn 100% giá trị tour (trừ
                  phí dịch vụ nếu có).
                </li>
                <li>
                  <strong>Hủy trước 3-6 ngày:</strong> Hoàn 70% giá trị tour.
                </li>
                <li>
                  <strong>Hủy trước 1-2 ngày:</strong> Hoàn 50% giá trị tour.
                </li>
                <li>
                  <strong>Hủy trong ngày hoặc không đến:</strong> Không hoàn
                  tiền.
                </li>
              </ul>
              <p className="text-sm text-gray-500 mt-2">
                * Một số tour đặc biệt (tour lễ Tết, tour đoàn lớn) có thể có
                chính sách hủy khác. Vui lòng kiểm tra chi tiết khi đặt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                3. Chính sách hủy khách sạn
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Hủy trước 48 giờ:</strong> Hoàn 100% tiền phòng (trừ
                  phí dịch vụ).
                </li>
                <li>
                  <strong>Hủy trước 24-48 giờ:</strong> Hoàn 50% tiền phòng.
                </li>
                <li>
                  <strong>Hủy trong vòng 24 giờ hoặc không đến:</strong> Không
                  hoàn tiền.
                </li>
              </ul>
              <p className="text-sm text-gray-500 mt-2">
                * Chính sách hủy có thể khác nhau tùy từng khách sạn. Vui lòng
                kiểm tra điều kiện cụ thể trên trang chi tiết khách sạn.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                4. Chính sách hủy hoạt động & thuê xe
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Hủy trước 24 giờ:</strong> Hoàn 100% (trừ phí dịch
                  vụ).
                </li>
                <li>
                  <strong>Hủy trong vòng 24 giờ:</strong> Không hoàn tiền.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                5. Trường hợp bất khả kháng
              </h2>
              <p>
                Trong trường hợp bất khả kháng (thiên tai, dịch bệnh, chiến
                tranh, lệnh cấm của chính quyền), 9 Trip Phú Quốc sẽ làm việc
                với đối tác để có phương án hỗ trợ tốt nhất cho khách hàng, bao
                gồm hoàn tiền, đổi lịch hoặc bảo lưu dịch vụ.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                6. Quy trình hoàn tiền
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Gửi yêu cầu hủy qua email:{" "}
                  <a
                    href="mailto:info@9tripphuquoc.com"
                    className="text-primary hover:underline"
                  >
                    info@9tripphuquoc.com
                  </a>{" "}
                  hoặc gọi 0877901901.
                </li>
                <li>
                  Nhân viên xác nhận yêu cầu và kiểm tra điều kiện hủy trong
                  vòng 24 giờ làm việc.
                </li>
                <li>
                  Tiền hoàn sẽ được chuyển khoản về tài khoản của bạn trong vòng
                  7-14 ngày làm việc (tùy ngân hàng).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                7. Liên hệ hỗ trợ
              </h2>
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
                <li>📞 Hotline: 0877901901</li>
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
