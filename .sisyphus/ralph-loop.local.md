---
active: true
iteration: 6
max_iterations: 500
completion_promise: "DONE"
initial_completion_promise: "DONE"
started_at: "2026-05-08T13:35:14.303Z"
session_id: "ses_1f83c372dffe9quOW0mw6l4RUW"
ultrawork: true
strategy: "continue"
message_count_at_start: 1
---
Lập kế hoạch để thực hiện nhiệm vụ sau: sử dụng skill hoặc tool web search để tìm kiếm 10 bài blog viết về du lịch phú quốc hay nhất trong 6 tháng gần đây trên internet, sử dụng từ khóa theo chủ đề: kinh nghiệm du lịch phú quốc, top khách sạn / resort / điểm đến hấp dẫn / đẹp / hottrend tại phú quốc...
- Clone dữ liệu các bài blog, bao gồm cả hình ảnh, video (nếu có).
- Thực hiện refactor lại nội dung để phù hợp với collection blog của hệ thống:
+ Viết lại nội dung bằng tiếng việt để tăng độ hấp dẫn, cập nhật thay đổi thông tin công ty thành 9 Trip Phú Quốc, cập nhật các internal link nếu có.
+ Sử dụng skill để download và tối ưu các file media và lưu vào storage.
+ Đảm bảo blog sau khi refactor vẫn giữ được thứ tự hiển thị giữa text và media và đúng schema collection blog
- Sau khi thực hiện  xong, output kết quả lần lượt để tôi xác nhận rồi Lưu dữ liệu vào firestore collection
- Báo cáo kết quả chi tiết sau cùng.
