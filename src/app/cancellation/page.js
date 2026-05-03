import Breadcrumb from "@/components/layout/Breadcrumb";

export const metadata = {
  title: "Chính sách thanh toán & hoàn, hủy, đổi trả — 9 Trip Phú Quốc",
  description:
    "Chính sách thanh toán và hoàn, hủy, đổi trả giao dịch của 9 Trip Phú Quốc. Tìm hiểu các phương thức thanh toán, điều kiện hủy tour, khách sạn và các dịch vụ khác.",
};

/**
 * CancellationPage — Trang chính sách thanh toán và hoàn, hủy, đổi trả giao dịch.
 */
export default function CancellationPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Chính sách thanh toán & hủy" },
        ]}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            Chính sách thanh toán & hoàn, hủy, đổi trả giao dịch
          </h1>

          <div className="prose max-w-none text-gray-700 space-y-8">
            {/* 1. PHƯƠNG THỨC THANH TOÁN */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                1. Phương thức thanh toán
              </h2>
              <p>
                Hiện tại, 9 Trip Phú Quốc cung cấp nhiều hình thức thanh toán linh hoạt giúp Quý khách có thể sử dụng dịch vụ một cách tiện ích nhất, trải nghiệm các phương thức thanh toán hiện đại nhất.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                Bước 1: Truy cập và lựa chọn dịch vụ
              </h3>
              <p>
                Quý khách truy cập vào website <strong>9tripphuquoc.com</strong>, tìm kiếm và chọn dịch vụ (tour du lịch, khách sạn, hoạt động trải nghiệm, thuê xe) cần mua.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                Bước 2: Kiểm tra chi tiết đơn hàng
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Thông tin dịch vụ;</li>
                <li>Số lượng;</li>
                <li>Mã khuyến mại (nếu có);</li>
                <li>Thành tiền;</li>
                <li>Phương thức thanh toán;</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                Bước 3: Lựa chọn phương thức thanh toán
              </h3>
              <p>
                Tại bước phương thức thanh toán, Quý khách lựa chọn một trong các hình thức sau:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Thanh toán trực tuyến qua thẻ ngân hàng:</strong> Quý khách được điều hướng đến cổng thanh toán để thực hiện giao dịch.
                </li>
                <li>
                  <strong>Thanh toán qua ví điện tử:</strong> Hỗ trợ các ví điện tử phổ biến.
                </li>
                <li>
                  <strong>Chuyển khoản ngân hàng:</strong> Quý khách chuyển khoản theo thông tin tài khoản được cung cấp sau khi đặt dịch vụ.
                </li>
                <li>
                  <strong>Thanh toán trực tiếp:</strong> Áp dụng cho một số dịch vụ nhất định theo thỏa thuận.
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                Bước 4: Xác nhận và hoàn tất
              </h3>
              <p>
                Sau khi thanh toán thành công, 9 Trip Phú Quốc sẽ thực hiện xử lý giao dịch và thông báo kết quả giao dịch cho Quý khách ngay lập tức qua email và/hoặc SMS.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4 rounded-r-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Lưu ý:</strong>
                </p>
                <ul className="text-sm text-yellow-800 list-disc pl-5 space-y-1 mt-1">
                  <li>Tùy vào phương thức thanh toán Quý khách lựa chọn, màn hình sẽ hiển thị các thông tin yêu cầu khác nhau.</li>
                  <li>Mã OTP có thể được gửi về điện thoại của Quý khách hoặc hiển thị trên ứng dụng Token (tùy thuộc vào từng ngân hàng).</li>
                  <li>Quý khách không cần đăng nhập thành viên vẫn có thể sử dụng các dịch vụ trên website 9tripphuquoc.com.</li>
                  <li>Nếu cần hỗ trợ, Quý khách vui lòng liên hệ qua Hotline <strong>0877901901</strong> hoặc email <strong>info@9tripphuquoc.com</strong>.</li>
                </ul>
              </div>
            </section>

            {/* 2. CHÍNH SÁCH HOÀN, HỦY, ĐỔI/TRẢ */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                2. Chính sách hoàn, hủy, đổi/trả
              </h2>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                2.1. Quy định về hủy đơn hàng
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Các dịch vụ do 9 Trip Phú Quốc niêm yết trên website không thể hủy bỏ và hoàn tiền sau khi đơn hàng đã được xác nhận, trừ khi có quy định cụ thể về điều kiện hủy trong chính sách cung cấp dịch vụ tương ứng.
                </li>
                <li>
                  <strong>Đơn hàng có thể được hủy trong các trường hợp sau:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Khách hàng đặt dịch vụ nhưng chưa thực hiện thanh toán.</li>
                    <li>Khách hàng đã đặt và thanh toán nhưng 9 Trip Phú Quốc chưa xác nhận đơn hàng hoặc dịch vụ đã hết số lượng, hạn mức cung ứng.</li>
                    <li>Đơn hàng được 9 Trip Phú Quốc chấp nhận hủy hoặc theo chính sách và sự chấp thuận của Nhà cung cấp dịch vụ.</li>
                    <li>Theo yêu cầu của Khách hàng trong trường hợp quy định tại điểm (ii) nêu trên.</li>
                  </ul>
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                2.2. Quy định về đổi, trả đơn hàng
              </h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Áp dụng cho những đơn hàng bị thanh toán lỗi.</li>
                <li>Áp dụng cho những đơn hàng được phép hoàn hủy, thay đổi căn cứ vào điều kiện của các Nhà cung cấp dịch vụ hoặc trong trường hợp xảy ra sự kiện bất khả kháng.</li>
                <li>Các dịch vụ thuộc danh mục không được đổi/trả theo quy định của Nhà cung cấp sẽ không được đổi/trả.</li>
                <li>
                  <strong>Dịch vụ có thể được xử lý đổi, trả hoặc hoàn tiền nếu đáp ứng đầy đủ các điều kiện sau:</strong>
                  <ul className="list-circle pl-5 space-y-1 mt-1">
                    <li>Khách hàng cung cấp thông tin chính xác về đơn hàng theo hướng dẫn của 9 Trip Phú Quốc.</li>
                    <li>Dịch vụ còn trong thời gian áp dụng đổi/trả theo quy định.</li>
                    <li>Phí hoàn sẽ được áp dụng tùy theo từng loại dịch vụ và Nhà cung cấp dịch vụ.</li>
                  </ul>
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                2.3. Quy định về thời gian xử lý hoàn tiền
              </h3>
              <p>
                Trong trường hợp đơn hàng đủ điều kiện hoàn tiền, thời gian xử lý hoàn tiền sẽ phụ thuộc vào phương thức thanh toán ban đầu của Khách hàng và quy trình của ngân hàng/tổ chức cung cấp dịch vụ thanh toán.
              </p>
              <p className="mt-2">
                <strong>Thời gian hoàn tiền dự kiến:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Thanh toán qua thẻ ngân hàng: 5 – 15 ngày làm việc tùy vào ngân hàng phát hành thẻ.</li>
                <li>Thanh toán qua ví điện tử: 3 – 7 ngày làm việc.</li>
                <li>Thanh toán bằng các phương thức khác: Theo thỏa thuận cụ thể với Khách hàng.</li>
              </ul>
              <p className="text-sm text-gray-500 mt-2">
                * 9 Trip Phú Quốc không chịu trách nhiệm đối với các khoản phí phát sinh từ phía ngân hàng hoặc tổ chức cung cấp dịch vụ thanh toán trong quá trình hoàn tiền (nếu có).
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                2.4. Trách nhiệm của các bên liên quan
              </h3>
              <p className="font-medium text-gray-800 mt-2">Trách nhiệm của Khách hàng:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cung cấp thông tin đặt dịch vụ chính xác, đầy đủ để đảm bảo quyền lợi đổi, trả hoặc hoàn tiền.</li>
                <li>Tuân thủ các điều kiện và quy định của Nhà cung cấp dịch vụ.</li>
                <li>Liên hệ với 9 Trip Phú Quốc ngay khi phát hiện sai sót hoặc có nhu cầu hủy/đổi/trả.</li>
              </ul>
              <p className="font-medium text-gray-800 mt-2">Trách nhiệm của 9 Trip Phú Quốc:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Đảm bảo cung cấp đầy đủ thông tin về chính sách hoàn hủy trên website.</li>
                <li>Hỗ trợ Khách hàng xử lý yêu cầu đổi, trả hoặc hoàn tiền theo đúng quy trình và thời gian quy định.</li>
                <li>Phối hợp với Nhà cung cấp dịch vụ để giải quyết các khiếu nại liên quan (nếu có).</li>
                <li>Hoàn trả lại tiền hoặc đổi trả dịch vụ cho khách hàng do nhầm lẫn, lỗi của 9 Trip Phú Quốc hoặc dịch vụ không đúng với thông tin đã công khai, niêm yết, giới thiệu.</li>
              </ul>
            </section>

            {/* 3. CHÍNH SÁCH GIAO NHẬN DỊCH VỤ */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800">
                3. Chính sách giao nhận dịch vụ
              </h2>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                3.1. Xác nhận đặt dịch vụ
              </h3>
              <p>
                Dịch vụ do 9 Trip Phú Quốc phân phối hợp pháp với tư cách đại lý của các Nhà cung cấp dịch vụ hoặc bên phân phối lại dịch vụ hợp tác cùng 9 Trip Phú Quốc. Ngay sau khi Khách hàng thanh toán đơn hàng thành công, hệ thống sẽ gửi thông báo xác nhận đặt dịch vụ kèm theo bằng chứng việc mua dịch vụ thông qua phương thức trực tuyến (SMS, Email được Khách hàng chỉ định khi đặt mua dịch vụ).
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                3.2. Thông tin xác nhận
              </h3>
              <p>
                Kèm theo bằng chứng về việc mua dịch vụ, 9 Trip Phú Quốc sẽ thông báo xác nhận về việc đặt dịch vụ của Khách hàng và mô tả các thông tin của đơn vị dịch vụ trong đơn hàng, bao gồm nhưng không giới hạn ở: thời gian cung cấp dịch vụ, địa điểm cung cấp dịch vụ, số ghế/phòng/chỗ…, số lượng đơn vị dịch vụ, Nhà cung cấp cung ứng dịch vụ.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                3.3. Bằng chứng mua dịch vụ
              </h3>
              <p>
                Bằng chứng mua dịch vụ là các loại vé, tài liệu xác nhận quyền sử dụng dịch vụ có thể được gửi cho Khách hàng qua các phương tiện trực tuyến (không giới hạn ở email, tin nhắn,…) dưới hình thức dữ liệu điện tử, miễn sao phù hợp với mô tả trong giao diện niêm yết của các sản phẩm đó.
              </p>
              <p className="mt-2">
                Bằng chứng của việc mua dịch vụ, tùy theo loại dịch vụ được đặt mua, được thể hiện thông qua các dạng, bao gồm nhưng không giới hạn ở:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Mã vé điện tử, mã QR:</strong> Đối với tour du lịch, hoạt động trải nghiệm, vé tham quan… sẽ được ghi nhận tại mục &ldquo;Vé của tôi&rdquo; trên website hoặc thông qua SMS, Email ngay sau khi Khách hàng hoàn tất đặt hàng và thanh toán thành công.
                </li>
                <li>
                  <strong>Xác nhận đặt phòng:</strong> Đối với dịch vụ khách sạn, bằng chứng là mã xác nhận đặt phòng được gửi qua email.
                </li>
                <li>
                  Tùy theo chính sách của Nhà cung cấp, Khách hàng có thể cần xuất trình mã xác nhận tại quầy để nhận vé giấy hoặc sử dụng trực tiếp mã điện tử tại địa điểm cung ứng dịch vụ.
                </li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                3.4. Kiểm tra thông tin giao dịch
              </h3>
              <p>
                Khách hàng có thể kiểm tra thông tin giao dịch mua dịch vụ, thông tin vé tại mục &ldquo;Thông báo&rdquo; trên website hoặc thông qua địa chỉ email chỉ định khi đặt hàng.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                3.5. Điều chỉnh thông tin dịch vụ
              </h3>
              <p>
                Bằng chứng đặt dịch vụ, mã vé đã được kết xuất trên hệ thống 9 Trip Phú Quốc và đã được khai báo với Nhà cung cấp không thể điều chỉnh thông tin, nội dung dịch vụ, trừ trường hợp do việc truyền thông tin sai của 9 Trip Phú Quốc tới Nhà cung cấp hoặc chính sách của Nhà cung cấp cho việc điều chỉnh thông tin, nội dung dịch vụ.
              </p>

              <h3 className="text-lg font-medium text-gray-800 mt-4">
                3.6. Xuất trình giấy tờ
              </h3>
              <p>
                Khách hàng đồng ý sẽ xuất trình giấy tờ tùy thân, tài liệu chứng thực nhân thân, và/hoặc thông tin giao dịch dịch vụ khi được yêu cầu bởi 9 Trip Phú Quốc hoặc Nhà cung cấp trực tiếp cung cấp dịch vụ tại thời điểm sử dụng dịch vụ.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
