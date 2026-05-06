# agent-browser CLI — Hướng dẫn sử dụng

> Phiên bản tài liệu dựa trên `agent-browser` v0.26+

`agent-browser` là CLI tự động hóa trình duyệt dành cho AI agents. Thay vì parse HTML/CSS selectors, agent sử dụng **accessibility snapshot** với **@ref** ngắn gọn để tương tác với trang.

---

## 1. Core Commands

| Lệnh | Mô tả | Ví dụ |
|------|--------|-------|
| `open <url>` | Mở URL trong trình duyệt | `agent-browser open https://example.com` |
| `click <sel>` | Click vào element (hoặc @ref) | `agent-browser click @e3` |
| `type <sel> <text>` | Gõ text vào element (không xóa nội dung cũ) | `agent-browser type @e2 "hello"` |
| `fill <sel> <text>` | Xóa rồi điền text vào element | `agent-browser fill @e2 "user@mail.com"` |
| `scroll <dir> [px]` | Cuộn trang (up/down/left/right) | `agent-browser scroll down 500` |
| `snapshot` | Chụp accessibility tree với @refs | `agent-browser snapshot -i` |
| `get <what> [sel]` | Lấy thông tin (text, html, value, url, title…) | `agent-browser get text @e5` |
| `wait <sel\|ms>` | Chờ element xuất hiện hoặc chờ ms | `agent-browser wait 2000` |
| `eval <js>` | Chạy JavaScript trên trang | `agent-browser eval "document.title"` |

### Các lệnh bổ sung hay dùng

```bash
agent-browser dblclick @e1          # Double-click
agent-browser press Enter            # Nhấn phím
agent-browser press Control+a        # Tổ hợp phím
agent-browser hover @e1              # Hover
agent-browser check @e1              # Check checkbox
agent-browser uncheck @e1            # Uncheck checkbox
agent-browser select @e1 "value"     # Chọn dropdown option
agent-browser scrollintoview @e1     # Scroll element vào viewport
agent-browser screenshot             # Chụp màn hình
agent-browser screenshot --full      # Chụp toàn trang
agent-browser back                   # Quay lại
agent-browser reload                 # Tải lại trang
agent-browser close                  # Đóng trình duyệt
```

### Snapshot flags

```bash
agent-browser snapshot              # Full accessibility tree
agent-browser snapshot -i           # Chỉ interactive elements (khuyên dùng)
agent-browser snapshot -c           # Compact output
agent-browser snapshot -d 3         # Giới hạn depth
agent-browser snapshot -s "#main"   # Scope theo CSS selector
```

### Get — Lấy dữ liệu từ trang

```bash
agent-browser get text @e1          # Text content của element
agent-browser get html @e1          # innerHTML
agent-browser get value @e1         # Giá trị input
agent-browser get attr @e1 href     # Attribute
agent-browser get title              # Tiêu đề trang
agent-browser get url                # URL hiện tại
agent-browser get count ".item"     # Đếm elements
agent-browser get box @e1            # Bounding box
agent-browser get styles @e1        # Computed styles
```

---

## 2. Wait Commands

`wait` là lệnh quan trọng nhất để đồng bộ với trang. Không dùng `sleep` — dùng `wait` với điều kiện cụ thể.

### `wait --fn "JS"` — Chờ JavaScript expression trả về truthy

Dùng khi cần chờ logic phức tạp: AJAX load, animation, state change, spinner biến mất.

```bash
# Chờ spinner biến mất
agent-browser wait --fn "!document.querySelector('.spinner')"

# Chờ dữ liệu AJAX render xong
agent-browser wait --fn "document.querySelectorAll('.tour-card').length > 0"

# Chờ biến global được set
agent-browser wait --fn "window.appReady === true"

# Chờ text cụ thể biến mất
agent-browser wait --fn "!document.body.innerText.includes('Loading...')"
```

### `wait --text "..."` — Chờ text xuất hiện trên trang

```bash
# Chờ text xuất hiện (substring match)
agent-browser wait --text "Welcome back"

# Chờ kết quả tìm kiếm
agent-browser wait --text "Kết quả tìm kiếm"
```

### Các chế độ wait khác

```bash
agent-browser wait "#loading"                    # Chờ element xuất hiện
agent-browser wait 2000                          # Chờ 2 giây (dùng ít, ưu tiên --fn)
agent-browser wait --url "**/dashboard"           # Chờ URL match pattern
agent-browser wait --load networkidle             # Chờ network idle
agent-browser wait --load domcontentloaded        # Chờ DOM ready
agent-browser wait @e5 --state hidden            # Chờ element ẩn đi
agent-browser wait @e5 --state detached          # Chờ element bị xóa khỏi DOM
agent-browser wait --download ./file.pdf         # Chờ download hoàn tất
```

### Quy tắc vàng cho wait

1. **Ưu tiên `--fn`** khi cần chờ logic JS (data render, spinner biến mất).
2. **Dùng `--text`** khi cần chờ nội dung cụ thể hiển thị.
3. **Dùng `--load networkidle`** sau khi navigate trang mới.
4. **KHÔNG dùng `wait <ms>`** (sleep) trừ khi không có cách nào khác.
5. **Luôn re-snapshot** sau khi wait xong — DOM đã thay đổi, @ref cũ không còn hợp lệ.

---

## 3. Batch Execution

`agent-browser batch` chạy nhiều lệnh liên tiếp, hữu ích cho automation scripts.

### Cú pháp cơ bản

```bash
# Truyền lệnh trực tiếp
agent-browser batch "open https://example.com" "snapshot -i" "screenshot"

# Dừng ngay khi gặp lỗi (--bail)
agent-browser batch --bail "open https://example.com" "click @e1" "screenshot"
```

### Stdin mode (JSON)

```bash
# Pipe JSON array
echo '[["open", "https://example.com"], ["snapshot", "-i"], ["click", "@e1"]]' | agent-browser batch

# Từ file
agent-browser batch < commands.json
```

### Output JSON

```bash
# Kết quả dạng JSON array
agent-browser batch --json "open https://example.com" "get title" "get url"
```

### Ví dụ thực tế: Scrape nhiều trang

```bash
#!/bin/bash
# Scrape tuần tự nhiều URL
URLS=("https://example.com/page1" "https://example.com/page2" "https://example.com/page3")

for url in "${URLS[@]}"; do
  agent-browser batch --bail \
    "open $url" \
    "wait --load networkidle" \
    "snapshot -i" \
    "get text body"
done
```

---

## 4. Scraping Patterns

### Pattern 1: Basic Scrape — Mở trang, lấy dữ liệu

```bash
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser snapshot -i
# Đọc @refs từ snapshot, rồi extract data
agent-browser get text @e5
agent-browser get attr @e8 href
agent-browser get text body
```

### Pattern 2: Lazy Content — Xử lý nội dung load động

Nhiều trang load nội dung khi scroll (infinite scroll, lazy load images).

```bash
agent-browser open https://example.com/tours
agent-browser wait --load networkidle

# Scroll và chờ nội dung mới render
for i in {1..5}; do
  agent-browser scroll down 1000
  agent-browser wait --fn "document.querySelectorAll('.tour-card').length > $(($i * 10))"
  agent-browser snapshot -i
done

# Lấy toàn bộ dữ liệu sau khi đã scroll hết
agent-browser get text body
```

### Pattern 3: Batch Operations — Xử lý nhiều phần tử

```bash
# Đếm số items
agent-browser open https://example.com/list
agent-browser wait --load networkidle
agent-browser snapshot -i

# Lấy số lượng bằng eval
TOTAL=$(agent-browser eval "document.querySelectorAll('.item').length")

# Xử lý từng item
for i in $(seq 1 "$TOTAL"); do
  agent-browser eval "document.querySelectorAll('.item')[$((i-1))].click()"
  agent-browser wait --fn "document.querySelector('.detail-panel')"
  agent-browser snapshot -i
  agent-browser get text @e_detail
  agent-browser press Escape
  agent-browser wait 500
done
```

### Pattern 4: Smart Wait — Chờ điều kiện cụ thể thay vì sleep

```bash
# ❌ SAI: Dùng sleep cố định
agent-browser click @e1
agent-browser wait 3000  # Có thể quá nhanh hoặc quá chậm

# ✅ ĐÚNG: Chờ điều kiện thực tế
agent-browser click @e1
agent-browser wait --fn "document.querySelector('.result-list').children.length > 0"

# ✅ Hoặc chờ text xuất hiện
agent-browser click @e1
agent-browser wait --text "Kết quả"

# ✅ Hoặc chờ URL thay đổi
agent-browser click @e1
agent-browser wait --url "**/results"
```

### Pattern 5: Booking Form Interaction — Điền form phức tạp

```bash
agent-browser open https://example.com/booking
agent-browser wait --load networkidle
agent-browser snapshot -i

# Điền thông tin
agent-browser fill @e1 "Nguyễn Văn A"
agent-browser fill @e2 "nguyenvana@email.com"
agent-browser fill @e3 "0901234567"

# Chọn ngày từ datepicker
agent-browser click @e4              # Mở datepicker
agent-browser wait --fn "document.querySelector('.datepicker.open')"
agent-browser snapshot -i            # Re-snapshot để thấy calendar
agent-browser click @e15             # Chọn ngày

# Chọn dropdown
agent-browser select @e5 "2 người"

# Check checkbox điều khoản
agent-browser check @e6

# Submit
agent-browser click @e7
agent-browser wait --url "**/confirmation"
agent-browser snapshot -i
```

### Pattern 6: Chaining — Nối lệnh với &&

```bash
# Mở trang, chờ load, chụp snapshot — tất cả trong 1 lệnh shell
agent-browser open https://example.com && agent-browser wait --load networkidle && agent-browser snapshot -i

# Điền form nhanh
agent-browser fill @e1 "user@example.com" && agent-browser fill @e2 "password" && agent-browser click @e3

# Login + verify
agent-browser open https://app.example.com/login && \
  agent-browser wait --load networkidle && \
  agent-browser snapshot -i && \
  agent-browser fill @e1 "user@example.com" && \
  agent-browser fill @e2 "password" && \
  agent-browser click @e3 && \
  agent-browser wait --url "**/dashboard" && \
  agent-browser snapshot -i
```

---

## 5. Common Mistakes

### ❌ Dùng `sleep` / `wait <ms>` thay vì điều kiện

```bash
# ❌ SAI — thời gian chờ cố định, không đáng tin cậy
agent-browser click @e1
agent-browser wait 3000
agent-browser snapshot -i

# ✅ ĐÚNG — chờ điều kiện thực tế
agent-browser click @e1
agent-browser wait --fn "document.querySelector('.results')"
agent-browser snapshot -i
```

**Tại sao:** Sleep cố định chờ quá lâu (waste time) hoặc quá ngắn (miss data). `--fn` chờ chính xác khi data sẵn sàng.

### ❌ Dùng `eval` để click thay vì `click`

```bash
# ❌ SAI — eval không trigger đúng event lifecycle
agent-browser eval "document.querySelector('.btn').click()"

# ✅ ĐÚNG — click qua @ref từ snapshot
agent-browser click @e3
```

**Tại sao:** `eval` click bypass accessibility, không trigger đúng event propagation, và không chờ actionability checks. Dùng `click @ref` đảm bảo element visible, enabled, và stable trước khi click.

### ❌ Quên re-snapshot sau khi DOM thay đổi

```bash
# ❌ SAI — @ref cũ không còn hợp lệ sau khi trang thay đổi
agent-browser snapshot -i
agent-browser click @e1    # Click mở dropdown
agent-browser click @e7    # @e7 có thể không còn tồn tại!

# ✅ ĐÚNG — luôn snapshot lại sau khi DOM đổi
agent-browser snapshot -i
agent-browser click @e1    # Click mở dropdown
agent-browser snapshot -i  # Re-snapshot để lấy @ref mới
agent-browser click @e7    # @ref mới từ dropdown vừa mở
```

**Tại sao:** Mỗi lần DOM thay đổi (navigate, click mở dropdown, AJAX load), @ref cũ bị invalidate. Phải snapshot lại để lấy @ref mới.

### ❌ Không chờ trang load trước khi tương tác

```bash
# ❌ SAI — tương tác ngay sau open, trang chưa load xong
agent-browser open https://example.com
agent-browser click @e1    # Element chưa tồn tại!

# ✅ ĐÚNG — chờ trang load xong
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser click @e1
```

### ❌ Dùng CSS selector thay vì @ref

```bash
# ❌ SAI — brittle, dễ vỡ khi DOM thay đổi
agent-browser click "#submit-btn"

# ✅ ĐÚNG — dùng @ref từ snapshot, ổn định hơn
agent-browser snapshot -i
agent-browser click @e3
```

**Tại sao:** @ref dựa trên accessibility tree, ổn định hơn CSS selector khi class thay đổi. Chỉ dùng CSS selector khi không thể snapshot (ví dụ trong batch script cố định).

### ❌ Không xử lý lỗi trong automation scripts

```bash
# ❌ SAI — script tiếp tục chạy dù lệnh trước thất bại
agent-browser open https://example.com
agent-browser click @e1
agent-browser get text @e5

# ✅ ĐÚNG — dùng --bail hoặc set -e
set -euo pipefail
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser click @e1 || { echo "Click failed"; exit 1; }
```
