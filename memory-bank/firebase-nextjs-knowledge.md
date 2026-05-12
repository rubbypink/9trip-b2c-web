# Firebase + Next.js Integration Knowledge Base

> Tổng hợp từ official docs, Context7, firebase-tools source, và thực tế triển khai.
> Cập nhật: May 2026

---

## 1. Kiến trúc tổng quan

### Firebase Hosting + Next.js hoạt động như thế nào?

Firebase CLI (firebase-tools) hỗ trợ deploy Next.js app lên Firebase Hosting thông qua tính năng **Web Frameworks** (cần enable: `firebase experiments:enable webframeworks`).

Cơ chế:
- **Static pages** (SSG, `generateStaticParams`): deploy lên Firebase Hosting CDN
- **Dynamic pages** (SSR, API routes, `getServerSideProps`): tự động tạo Cloud Function để chạy server-side code
- Firebase CLI **tự động detect** Next.js config và translate sang Firebase config

### `frameworksBackend` trong firebase.json

```json
"hosting": {
    "source": ".",
    "frameworksBackend": {
        "region": "asia-southeast1"
    }
}
```

- `source`: thư mục gốc của Next.js project
- `frameworksBackend.region`: region cho Cloud Function SSR
- Firebase CLI tự tạo Cloud Function tên `ssr{projectname}` để phục vụ SSR

### Luồng deploy

```
1. Firebase CLI detect Next.js project
2. Chạy `next build` (nếu chưa build)
3. Đọc `.next/` output
4. Tạo Cloud Function package:
   - server.js (wrapper gọi firebase-frameworks)
   - package.json (tổng hợp dependencies)
   - Copy các file cần thiết
5. Deploy function + static files lên hosting
```

---

## 2. Cách Firebase xử lý node_modules

### Ignore pattern trong hosting

```json
"ignore": ["firebase.json", "**/node_modules/**", "functions/", ".github"]
```

- `**/node_modules/**`: **KHÔNG copy** bất kỳ `node_modules` nào từ root project lên staging
- Firebase CLI **tự chạy `npm install --production`** trong staging directory
- Package.json được generate từ root `package.json` `dependencies` + thêm `firebase-functions` + `firebase-frameworks`

### Kết quả

- Upload size = dependencies production (~600MB với project lớn) + `.next/` build artifacts
- Đây là thiết kế **có chủ đích** của Firebase — đảm bảo function có đúng dependencies trên Cloud Functions runtime
- **Không phải bug** — là cơ chế hoạt động bình thường

---

## 3. `output: 'standalone'` và Firebase

### Next.js standalone output

Next.js `output: 'standalone'` tạo `.next/standalone/` với:
- `server.js`: entry point
- `node_modules/`: **chỉ traced dependencies** (đã tree-shake)
- `.next/`: bản copy của build output
- `package.json`: copy từ root

### Firebase có hỗ trợ không?

- Firebase CLI **KHÔNG tự động dùng** `.next/standalone/` cho framework function
- Firebase CLI dùng cơ chế riêng: generate `package.json` → `npm install` → deploy
- `output: 'standalone'` giúp giảm kích thước build artifacts nhưng **không ảnh hưởng** đến cách Firebase package function

### Kết luận

`output: 'standalone'` hữu ích cho:
- Docker deployment
- Cloud Run deployment
- Tự host Next.js server

**Không hữu ích** cho Firebase `frameworksBackend` vì Firebase không dùng nó.

---

## 4. Environment Variables

### Local development (Emulator)

Firebase Emulator load env từ:
1. `functions/.env` (ưu tiên cao nhất)
2. `functions/.env.local`
3. `functions/.env.{projectId}`
4. Project root `.env.local` (cho Next.js dev)

### Production (Cloud Functions)

3 cách set env cho production:

| Cách | Dùng khi | Command |
|------|----------|---------|
| **Firebase Secrets** | Secret keys, API keys | `firebase functions:secrets:set KEY` |
| **`defineSecret()`** | Code-defined secrets với type safety | `import { defineSecret } from 'firebase-functions/params'` |
| **`.env` files** | **Chỉ local emulator**, không deploy lên production | File `.env` trong functions/ |

### `FIREBASE_*` prefix

- `FIREBASE_CONFIG`, `FIREBASE_PROJECT_ID` — **reserved bởi Firebase CLI**
- Không nên dùng `FIREBASE_*` prefix cho custom env vars
- Dùng prefix riêng như `APP_FIREBASE_*`, `CUSTOM_*`

---

## 5. Firebase Functions Secrets

### `defineSecret()` pattern

```typescript
import { defineSecret } from 'firebase-functions/params';

const apiKey = defineSecret('STRIPE_KEY');

export const myFunc = onRequest({
    secrets: [apiKey]
}, async (req, res) => {
    const key = apiKey.value();  // ← Truy cập qua .value()
});
```

### Set secret value

```bash
firebase functions:secrets:set STRIPE_KEY
# Nhập value từ prompt
```

### Quan trọng

- Secrets phải được **khai báo trong `secrets` array** của function
- Truy cập qua `.value()` — không dùng `process.env` cho secrets
- Secrets được lưu trong Google Cloud Secret Manager

---

## 6. Cấu trúc functions/ với custom Cloud Functions

### Two-function setup

Project này có 2 nhóm functions:

1. **Custom Cloud Functions** (`functions/` source):
   - `apiCore`, `apiPayments`, `apiWebhooks`
   - Express-based micro-monoliths
   - Firestore triggers (`onDocumentCreated`, `onDocumentUpdated`)
   - Scheduled tasks (`onSchedule`)
   - **Cần `node_modules` riêng** — được ignore khi deploy và cài trên Cloud Build

2. **Framework Backend Function** (tự động từ `hosting.frameworksBackend`):
   - SSR function `ssrtripphuquocdbfs`
   - Tự động tạo bởi Firebase CLI
   - Không cần config trong `functions/`

### Predeploy script

```json
"predeploy": [
    "cp -r ~/projects/tripphuquoc-db-fs/packages/shared ./vendor-shared",
    "node -e \"...\""
]
```

- Copy `packages/shared` → `vendor-shared` để function có shared code
- Sửa `package.json` để dùng local path `file:./vendor-shared`
- Postdeploy: restore `package.json` và xóa `vendor-shared`

---

## 7. Những điều KHÔNG NÊN làm

### ❌ Không nên sửa cơ chế deploy của Firebase

Firebase CLI đã được thiết kế để:
- Tự quản lý `node_modules` cho framework function
- Tự generate `package.json` phù hợp
- Tự quyết định file nào cần upload

**Việc can thiệp (sửa ignore, đổi deps, hack package.json) sẽ gây lỗi không lường trước.**

### ❌ Không nên dùng `output: 'standalone'` để giảm deploy size

Như đã phân tích ở trên — Firebase không dùng standalone output. Việc thêm config này không giúp ích mà có thể gây side effect.

### ❌ Không nên đổi `FIREBASE_*` prefix trong package.json

Nếu code đang dùng `FIREBASE_*` prefix và deploy vẫn chạy — **để nguyên**. Không sửa chỉ vì "best practice" nếu hiện tại không có vấn đề.

---

## 8. Những điều NÊN làm để tối ưu

### ✅ Tối ưu dependencies

- Review `package.json` dependencies — xóa package không dùng
- Chuyển các package chỉ dùng trong development sang `devDependencies`
- Dùng `npm dedupe` để giảm trùng lặp

### ✅ Clean build artifacts

- Xóa `.next/` trước mỗi lần build production
- Xóa `.firebase/` cache nếu gặp vấn đề staging

### ✅ Dùng đúng ignore patterns

```json
"ignore": ["firebase.json", "**/node_modules/**", "functions/", ".github", ".next/dev/**"]
```

- `.next/dev/**` — dev build cache (có thể lên tới 500MB), không cần cho production

### ✅ Tách biệt functions và Next.js

- Custom functions dùng dependencies riêng trong `functions/package.json`
- Next.js app dùng dependencies trong root `package.json`
- Hai bộ `node_modules` độc lập, không share

### ✅ Production secrets qua Secret Manager

```bash
firebase functions:secrets:set APP_FIREBASE_PROJECT_ID
firebase functions:secrets:set APP_FIREBASE_CLIENT_EMAIL
firebase functions:secrets:set APP_FIREBASE_PRIVATE_KEY
```

- Không để secret trong `.env.local` cho production
- Dùng `defineSecret()` trong code functions

---

## 9. Các câu hỏi thường gặp

### Q: Deploy size 400MB+ có bình thường không?

**A: Có**, với Next.js app có nhiều dependencies (firebase-admin, sharp, google-cloud). Đây là tổng của tất cả production dependencies được `npm install` trên Cloud Build.

### Q: Làm sao giảm deploy size?

**A:** Cách hiệu quả nhất là giảm số lượng dependencies trong `dependencies`:
- Chuyển dev-only packages sang `devDependencies`
- Xóa packages không dùng
- Dùng alternative nhẹ hơn (vd: thay `sharp` bằng `@img/sharp` nếu có thể)

Firebase **tự quản lý** việc package và deploy. Không nên can thiệp vào cơ chế này.

### Q: `FIREBASE_PROJECT_ID` có bị conflict với Firebase CLI không?

**A:** Firebase CLI dùng `FIREBASE_CONFIG` (JSON chứa project info). `FIREBASE_PROJECT_ID` có thể không conflict trực tiếp nhưng nên dùng prefix riêng để tránh rủi ro.

---

## 10. Tài liệu tham khảo

- [Firebase Hosting + Next.js](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Firebase Frameworks Overview](https://firebase.google.com/docs/hosting/frameworks-overview)
- [Cloud Functions Env Configuration](https://firebase.google.com/docs/functions/config-env)
- [firebase-tools GitHub](https://github.com/firebase/firebase-tools)
- [firebase-frameworks npm](https://www.npmjs.com/package/firebase-frameworks)

---

## 11. Phân tích codebase hiện tại

Dựa trên kiến thức trên, phân tích codebase `tripphuquoc-db-fs`:

### Cấu trúc hiện tại

```
tripphuquoc-db-fs/
├── firebase.json          # Hosting + functions config
├── next.config.mjs        # Next.js config
├── package.json           # Root dependencies (Next.js app)
├── functions/             # Custom Cloud Functions
│   ├── package.json       # Functions dependencies (độc lập)
│   └── index.js           # Entry point
├── packages/shared/       # Shared code giữa Next.js và Functions
└── src/                   # Next.js app source
```

### Điểm đúng — không cần thay đổi

| # | Điểm | Lý do |
|---|------|-------|
| 1 | `functions/package.json` có `firebase-functions: ^7.2.5` | Đã được commit, tương thích `firebase-admin@13.x` |
| 2 | `hosting.ignore: ["**/node_modules/**"]` | Chuẩn Firebase, không copy node_modules khi deploy |
| 3 | `functions.ignore: ["node_modules"]` | Custom functions không upload node_modules |
| 4 | `output: 'standalone'` **KHÔNG** có trong `next.config.mjs` | Đúng — Firebase không dùng standalone |
| 5 | `FIREBASE_*` prefix trong `packages/shared/env.js` | Dù không lý tưởng nhưng đang hoạt động, không cần đổi |
| 6 | `.env.local` chứa credentials cho local dev | Chuẩn — gitignored, dùng cho emulator |

### Điểm nên cải thiện

| # | Vấn đề | Mức độ | Đề xuất |
|---|--------|--------|---------|
| 1 | `firestore.rules` path dùng `~/` trong firebase.json | 🔴 Bug | Sửa thành `packages/shared/firestore.rules` (relative) |
| 2 | Deploy size ~400MB cho framework function | 🟡 Bình thường | Tối ưu: review dependencies, chuyển dev-only sang `devDependencies` |
| 3 | `.next/dev/` cache 500MB+ tồn tại khi deploy | 🟡 Lãng phí | Thêm `.next/dev/**` vào hosting ignore |
| 4 | Thiếu `.env` cho functions local emulator | 🟡 Convenience | Tạo `functions/.env` với `APP_FIREBASE_*` vars |
| 5 | `FIREBASE_*` prefix có thể conflict với CLI | 🟢 Low risk | Nếu chưa có vấn đề thì để nguyên |

### Firestore rules path bug (đã fix)

```diff
- "rules": "~/projects/tripphuquoc-db-fs/packages/shared/firestore.rules"
+ "rules": "packages/shared/firestore.rules"
```

Firebase CLI không expand `~` khi đọc path trong `firebase.json`. Dùng relative path từ project root.

### Kết luận

1. **Codebase đang ở trạng thái tốt.** Không có vấn đề nghiêm trọng.
2. **Deploy size 400MB là bình thường** với Firebase + Next.js. Firebase tự quản lý.
3. **Không cần `output: 'standalone'`** — Firebase không dùng nó, thêm vào chỉ gây rối.
4. **Không cần đổi `FIREBASE_*` prefix** — nếu chưa gây lỗi, giữ nguyên.
5. **Bug duy nhất đã fix:** firestore.rules path.
6. **Tối ưu nhỏ:** thêm `.next/dev/**` vào ignore, tạo `functions/.env`.
