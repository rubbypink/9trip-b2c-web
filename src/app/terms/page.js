import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata = {
  title: "Điều khoản sử dụng — 9 Trip Phú Quốc",
  description:
    "Điều khoản sử dụng dịch vụ của 9 Trip Phú Quốc. Vui lòng đọc kỹ trước khi sử dụng website và dịch vụ của chúng tôi.",
};

/**
 * TermsPage — Trang điều khoản sử dụng.
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Điều khoản sử dụng" },
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">
            Điều khoản sử dụng
          </h1>

          <div className="prose max-w-none text-foreground space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-foreground">
                1. Giới thiệu
              </h2>
              <p>
                Chào mừng bạn đến với website 9tripphuquoc.com (“Website”), được
                vận hành bởi Công ty TNHH 9 Trip Phú Quốc (“9 Trip Phú Quốc”,
                “chúng tôi”). Bằng việc truy cập và sử dụng Website, bạn đồng ý
                tuân thủ các điều khoản và điều kiện được nêu trong tài liệu này
                (“Điều khoản sử dụng”). Nếu bạn không đồng ý với bất kỳ điều
                khoản nào, vui lòng không sử dụng Website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                2. Định nghĩa
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>“Người dùng”</strong> — bất kỳ cá nhân hoặc tổ chức
                  nào truy cập hoặc sử dụng Website.
                </li>
                <li>
                  <strong>“Dịch vụ”</strong> — các dịch vụ đặt tour du lịch,
                  khách sạn, hoạt động trải nghiệm và thuê xe được cung cấp qua
                  Website.
                </li>
                <li>
                  <strong>“Đối tác”</strong> — các nhà cung cấp dịch vụ du lịch,
                  khách sạn, vận chuyển liên kết với 9 Trip Phú Quốc.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                3. Điều kiện sử dụng
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Bạn phải từ đủ 18 tuổi hoặc có sự đồng ý của người giám hộ hợp
                  pháp để sử dụng Dịch vụ.
                </li>
                <li>
                  Bạn cam kết cung cấp thông tin chính xác, đầy đủ khi đăng ký
                  tài khoản và đặt dịch vụ.
                </li>
                <li>
                  Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình.
                </li>
                <li>
                  Nghiêm cấm sử dụng Website cho mục đích bất hợp pháp, gian
                  lận, hoặc gây hại.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                4. Đặt dịch vụ và thanh toán
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Giá hiển thị trên Website có thể thay đổi mà không cần thông
                  báo trước. Giá cuối cùng được xác nhận tại thời điểm đặt.
                </li>
                <li>
                  Việc đặt dịch vụ chỉ được xác nhận sau khi thanh toán thành
                  công và nhận được email xác nhận từ chúng tôi.
                </li>
                <li>
                  Chúng tôi chấp nhận các phương thức thanh toán được liệt kê
                  trên Website tại từng thời điểm.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                5. Hủy và hoàn tiền
              </h2>
              <p>
                Chính sách hủy và hoàn tiền được quy định riêng cho từng dịch
                vụ. Vui lòng tham khảo{" "}
                <a
                  href="/cancellation"
                  className="text-primary hover:underline"
                >
                  Chính sách hủy
                </a>{" "}
                để biết chi tiết.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                6. Quyền sở hữu trí tuệ
              </h2>
              <p>
                Tất cả nội dung trên Website bao gồm văn bản, hình ảnh, logo,
                biểu tượng, phần mềm thuộc quyền sở hữu của 9 Trip Phú Quốc
                hoặc các đối tác cấp phép. Nghiêm cấm sao chép, phân phối hoặc
                sử dụng khi chưa được sự đồng ý bằng văn bản.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                7. Giới hạn trách nhiệm
              </h2>
              <p>
                9 Trip Phú Quốc hoạt động như một nền tảng trung gian kết nối
                người dùng với các đối tác cung cấp dịch vụ. Chúng tôi không
                chịu trách nhiệm trực tiếp về chất lượng dịch vụ do đối tác cung
                cấp, nhưng cam kết hỗ trợ giải quyết khiếu nại trong phạm vi hợp
                lý.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                8. Thay đổi điều khoản
              </h2>
              <p>
                Chúng tôi có quyền cập nhật Điều khoản sử dụng bất kỳ lúc nào.
                Các thay đổi sẽ có hiệu lực ngay khi được đăng tải. Việc tiếp
                tục sử dụng Website sau khi thay đổi đồng nghĩa với việc bạn
                chấp nhận các điều khoản mới.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                9. Liên hệ
              </h2>
              <p>
                Mọi thắc mắc về Điều khoản sử dụng, vui lòng liên hệ:
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
