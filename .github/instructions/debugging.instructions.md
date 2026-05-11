---
description: "Luồng phân tích và xử lý lỗi (Debugging Flow) chuẩn cho 9 Trip B2C, áp dụng khi debug lỗi build, runtime, console, hydration, giao diện."
applyTo: "**/*.js"
---

# 9 Trip B2C — Debugging & Error Handling Flow

Khi phân tích nguyên nhân lỗi và đề xuất hướng xử lý (đặc biệt khi dùng Local Debugger), BẮT BUỘC tuân theo luồng sau để bắt bệnh chuẩn xác và phù hợp với kiến trúc hiện tại (Next.js 16 App Router, Firebase, Tailwind v4, Vanilla JS + JSDoc):

## 0. Memory Bank Check (BẮT BUỘC)

Trước khi bắt đầu phân tích lỗi, luôn đọc Memory Bank để hiểu kiến trúc và quy ước dự án:

1. **Đọc `systemPatterns.md`**: Nắm kiến trúc tổng thể, pattern chính (Server-First, Firestore serialization, etc.).
2. **Đọc `projectContext.md`**: Hiểu business context, tính năng đang phát triển.
3. **Đọc `activeContext.md`**: Nắm trạng thái hiện tại của dự án, công việc đang làm dở.
4. **Kiểm tra schema liên quan**: Trong `memory-bank/schemas/`, tìm file schema tương ứng với collection/data đang xử lý (ví dụ `tours-schema.mjs` cho Tour, `hotels-schema.mjs` cho Hotel).
5. **Tham khảo `system.instructions.md`**: Đọc lại các Absolute Constraints ở file `.github/instructions/system.instructions.md` để đảm bảo không vi phạm quy tắc hệ thống (JS only, App Router, JSDoc, Tailwind v4, etc.).

> **Tại sao bắt buộc?** Nhiều lỗi trong dự án phát sinh từ việc không nắm rõ schema và kiến trúc. Đọc Memory Bank giúp phát hiện sớm các mismatch giữa code và schema chuẩn.

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
6. **Kiểm tra Schema Compliance (RẤT QUAN TRỌNG):**
   - Lỗi phổ biến: Code truy cập field không tồn tại trong schema chuẩn, hoặc dùng sai kiểu dữ liệu (ví dụ: đọc `duration.days` khi `duration` là string).
   - Luôn đối chiếu field access pattern với canonical schema trong `memory-bank/schemas/`:
     - Tours: `memory-bank/schemas/tours-schema.mjs`
     - Hotels: `memory-bank/schemas/hotels-schema.mjs`
     - Activities: `memory-bank/schemas/activities-schema.mjs`
     - Bookings: `memory-bank/schemas/bookings-schema.mjs`
     - Users: `memory-bank/schemas/users-schema.mjs`
   - Đặc biệt kiểm tra:
     - Tên field có khớp chính xác không? (ví dụ: `location` khác `locationName`)
     - Kiểu dữ liệu có đúng không? (ví dụ: `duration` là string, không phải object)
     - Field có tồn tại ở đúng cấp nesting không? (ví dụ: `rating.average` chứ không phải `ratingAverage`)
   - Nếu code tham chiếu field không có trong schema, đó là BUG cần sửa (dùng field đúng từ schema) hoặc là legacy data cần migration.

## 3. Hướng Xử lý Tối ưu (Fix Proposal)
- **Giữ chuẩn Server-First:** Chỉ biến component thành Client Component (thêm `'use client'`) ở mức "lá" (leaf component). Tránh việc thêm `'use client'` ở file layout hoặc page gốc làm mất lợi ích SSR.
- **Tuân thủ JS thuần & JSDoc:** Mọi code sửa đổi ĐẢM BẢO viết bằng JavaScript, bổ sung mô tả JSDoc đầy đủ cho hàm/props. Tuyệt đối không dùng TypeScript.
- **Tuân thủ hệ thống rules:** Xem lại `.github/instructions/system.instructions.md` để đảm bảo fix không vi phạm Absolute Constraints (đặc biệt là JS only, App Router, không admin/partner, Tailwind v4, Firebase modular imports).
- **Ưu tiên đúng Schema:** Khi sửa lỗi liên quan đến dữ liệu, luôn dùng tên field và kiểu dữ liệu từ canonical schema trong `memory-bank/schemas/`. Nếu legacy data có field cũ, cần migration song song thay vì code workaround.
- **Giải thích:** Trình bày ngắn gọn nguyên nhân gốc rễ theo chuẩn kiến trúc (Ví dụ: "Lỗi do truyền Timestamp chưa serialize xuống Client Component...") và đưa ra code fix chính xác.
