---
description: "Luồng phân tích và xử lý lỗi (Debugging Flow) chuẩn cho 9 Trip B2C, áp dụng khi debug lỗi build, runtime, console, hydration, giao diện."
applyTo: "**/*.js"
---

# 9 Trip B2C — Debugging & Error Handling Flow

Khi phân tích nguyên nhân lỗi và đề xuất hướng xử lý (đặc biệt khi dùng Local Debugger), BẮT BUỘC tuân theo luồng sau để bắt bệnh chuẩn xác và phù hợp với kiến trúc hiện tại (Next.js 16 App Router, Firebase, Tailwind v4, Vanilla JS + JSDoc):

## 1. Phân loại Lỗi (Error Categorization)
Xác định ngay lỗi thuộc nhóm nào dựa trên môi trường phát sinh:
- **Lỗi Server/Build (Terminal):** Lỗi Node.js, lỗi route, dùng API client ở server, thiếu module, hoặc chưa serialize dữ liệu Firebase trước khi truyền xuống Client.
- **Lỗi Client/Console (Browser):** Dùng React Hook ở Server Component (quên `'use client'`), lỗi Hydration (mismatched HTML giữa server/client), hoặc logic UI JS.
- **Lỗi UI/Visual:** Class Tailwind v4 không hoạt động, bố cục sai.

## 2. Luồng Kiểm tra Kiến trúc (Architectural Checklist)
Sau khi có dòng code gây lỗi, lập tức đối chiếu với các "điểm mù" phổ biến của dự án:
1. **Kiểm tra Client vs Server Boundary:** 
   - Nếu lỗi liên quan đến `useState`, `useEffect`, `window`, `document`, hoặc event handler (`onClick`), component đó ĐÃ có `'use client'` ở dòng đầu tiên chưa?
2. **Kiểm tra Firestore Serialization (RẤT QUAN TRỌNG):**
   - Lỗi phổ biến: *“Only plain objects can be passed to Client Components”*.
   - Giải pháp: Dữ liệu từ Firestore (đặc biệt chứa `Timestamp`) truyền từ Server xuống Client Component BẮT BUỘC phải bọc qua hàm `serializeDoc()` (ví dụ: `import { serializeDoc } from "@/lib/firestore"`).
3. **Kiểm tra Firebase Import:**
   - Import có đúng chuẩn Modular không? (đúng: `import { getAuth } from 'firebase/auth'`, sai: `import firebase from 'firebase'`).
4. **Kiểm tra Hydration Mismatch:**
   - Thẻ `<a>` lồng trong `<a>`? Thẻ `<p>` chứa `<div>`? Hoặc render UI dựa trên `window.innerWidth` ở lần render đầu tiên?
5. **Kiểm tra UI / Tailwind v4:**
   - Có vô tình dùng CSS Modules hay Inline styles không? (Phải chuyển sang Tailwind).

## 3. Hướng Xử lý Tối ưu (Fix Proposal)
- **Giữ chuẩn Server-First:** Chỉ biến component thành Client Component (thêm `'use client'`) ở mức "lá" (leaf component). Tránh việc thêm `'use client'` ở file layout hoặc page gốc làm mất lợi ích SSR.
- **Tuân thủ JS thuần & JSDoc:** Mọi code sửa đổi ĐẢM BẢO viết bằng JavaScript, bổ sung mô tả JSDoc đầy đủ cho hàm/props. Tuyệt đối không dùng TypeScript.
- **Giải thích:** Trình bày ngắn gọn nguyên nhân gốc rễ theo chuẩn kiến trúc (Ví dụ: "Lỗi do truyền Timestamp chưa serialize xuống Client Component...") và đưa ra code fix chính xác.
