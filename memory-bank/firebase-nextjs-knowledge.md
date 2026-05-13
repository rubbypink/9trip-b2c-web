# Firebase + Next.js Integration Knowledge Base

> Tổng hợp từ official docs, Context7, firebase-tools source, và thực tế triển khai.
> Cập nhật: 2026-05-13 — Thêm Section 12-17: Codebase Separation, Troubleshooting, Stability Standards

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
| **`.env`     files** | **Chỉ local emulator**, không deploy lên production | File `.env` trong functions/ |

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

Project này có 2 nhóm functions, được phân tách bằng **codebase name**:

1. **Custom Cloud Functions** (codebase `"api"`, source `functions/`):
   - `apiCore`, `apiPayments`, `apiWebhooks` — Express micro-monoliths (HTTP)
   - `onUserCreatedV2`, `onPasswordChangedV2`, `onUserDeletedV2` — Firestore triggers
   - `onBookingCreatedV2`, `onBookingPaidV2`, `onBookingCancelledV2`, `onBookingModifiedV2` — Firestore triggers
   - `cleanupExpiredHolds`, `cancelAbandonedBookings` — Scheduled tasks
   - `chatWithEmily` — Callable function
   - **Tổng cộng 13 functions** trong codebase `api`

2. **Framework Backend Function** (codebase `firebase-frameworks-tripphuquoc-db-fs`, auto-managed):
   - SSR function `ssrtripphuquocdbfs`
   - Tự động tạo bởi Firebase CLI từ `hosting.frameworksBackend`
   - **Không cần config thủ công** — Firebase CLI tự quản lý toàn bộ

> ⚠️ **Quan trọng**: KHÔNG dùng codebase `"default"`. Khi codebase là `"default"`, Firebase CLI dùng chung thư mục `.firebase/<project>/functions/` với framework function → gây conflict khi deploy `functions + hosting` cùng lúc. Luôn dùng codebase name riêng (vd: `"api"`) để tách biệt.

### Predeploy script (`scripts/predeploy.mjs`)

Script tự động chạy trước khi deploy custom functions để chuẩn bị shared code:

```
1. Clean functions/vendor-shared (xóa bản cũ)
2. Copy packages/shared → functions/vendor-shared
3. Update functions/package.json: @9trip/shared → file:./vendor-shared
4. Sync package-lock.json: npm install --package-lock-only
```

**Nguyên tắc quan trọng**:
- ✅ Chỉ xóa `vendor-shared/` cũ, không động vào `.firebase/`
- ✅ Luôn sync `package-lock.json` sau khi sửa `package.json` — Firebase CLI dùng `npm ci` khi deploy, yêu cầu lock file khớp tuyệt đối
- ❌ **KHÔNG** xóa `.firebase/` — Firebase CLI tự quản lý cache; xóa nó sẽ phá hủy framework function build, gây lỗi `directory not found`

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
- Xóa các phần tử trong `.firebase/` để bỏ cache nếu gặp vấn đề staging

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

| # | Vấn đề | Mức độ | Trạng thái | Đề xuất |
|---|--------|--------|------------|---------|
| 1 | `firestore.rules` path dùng `~/` trong firebase.json | 🔴 Bug | ✅ Đã fix | Đã sửa thành relative path |
| 2 | Codebase name `"default"` gây conflict với framework function | 🔴 Bug | ✅ Đã fix (2026-05-13) | Đổi thành `"api"` — xem Section 12 |
| 3 | Predeploy xóa `.firebase/` phá hosting build | 🔴 Bug | ✅ Đã fix (2026-05-13) | Bỏ bước xóa `.firebase/`, thêm sync lock file |
| 4 | Deploy size ~400MB cho framework function | 🟡 Bình thường | ⚠️ Cần theo dõi | Tối ưu: review dependencies, chuyển dev-only sang `devDependencies` |
| 5 | `.next/dev/` cache 500MB+ tồn tại khi deploy | 🟡 Lãng phí | ✅ Đã fix | Đã thêm `.next/dev/**` vào hosting ignore |
| 6 | Thiếu `.env` cho functions local emulator | 🟡 Convenience | — | Tạo `functions/.env` với `APP_FIREBASE_*` vars |
| 7 | `FIREBASE_*` prefix có thể conflict với CLI | 🟢 Low risk | — | Nếu chưa có vấn đề thì để nguyên |

### Firestore rules path bug (đã fix)

```diff
- "rules": "~/projects/tripphuquoc-db-fs/packages/shared/firestore.rules"
+ "rules": "packages/shared/firestore.rules"
```

Firebase CLI không expand `~` khi đọc path trong `firebase.json`. Dùng relative path từ project root.

### Kết luận

1. **Codebase đang ở trạng thái ổn định.** Tất cả bug nghiêm trọng đã fix (2026-05-13).
2. **Codebase separation `"api"`** đã triển khai — không còn conflict giữa custom functions và framework function.
3. **Deploy size 400MB là bình thường** với Firebase + Next.js. Firebase tự quản lý.
4. **Không cần `output: 'standalone'`** — Firebase không dùng nó, thêm vào chỉ gây rối.
5. **Predeploy script đã ổn định** — 4 bước, không conflict với hosting build.
6. **Xem Section 12-17** bên dưới để biết tất cả lỗi đã gặp, cách fix, và deploy standards.

---

## 12. Codebase Separation Strategy

### Vấn đề gốc

Khi deploy `firebase deploy --only functions,hosting`, Firebase CLI tạo 2 nhóm function **hoàn toàn độc lập** nhưng **dùng chung thư mục cache** nếu không được cấu hình đúng:

| Nhóm | Codebase name | Thư mục cache (`.firebase/{project}/`) |
|------|--------------|---------------------------------------|
| Framework function (Next.js SSR `ssrtripphuquocdbfs`) | `firebase-frameworks-{project}` | `functions/` |
| Custom Cloud Functions (apiCore, triggers...) | Phụ thuộc config | Nếu `"default"` → `functions/` (conflict!) |
|  |  | Nếu `"api"` → `api/` (tách biệt) |

### Codebase `"default"` — NGUY HIỂM

Khi `codebase` là `"default"` (single codebase legacy mode), Firebase CLI map vào thư mục `functions/` — **trùng với framework function**. Hậu quả:
- Predeploy xóa `.firebase/` → phá hủy framework function build → lỗi `directory not found`
- Hai function group ghi đè cache của nhau → conflict khó lường
- Không thể deploy `functions,hosting` cùng lúc

### Fix: `"api"` codebase

```json
{
  "functions": [{
    "source": "functions",
    "codebase": "api",
    "predeploy": ["node scripts/predeploy.mjs"],
    "postdeploy": ["node scripts/postdeploy.mjs"]
  }]
}
```

Kết quả deploy cache:
```
.firebase/tripphuquoc-db-fs/
├── functions/    ← Framework function (Next.js SSR) — Firebase CLI auto-manage
├── hosting/      ← Static files
└── api/          ← Custom functions (codebase "api") — KHÔNG conflict
```

### Hàm ý khi đổi codebase name

| Khía cạnh | Ảnh hưởng |
|-----------|-----------|
| Tên function | ✅ Không đổi — `apiCore`, `onBookingCreatedV2`,... vẫn giữ nguyên |
| Hosting rewrites | ✅ Không ảnh hưởng — rewrite trỏ theo tên function |
| Firestore triggers | ⚠️ Sẽ redeploy → có thể báo lỗi type change (xem Error 3) |
| Scheduled functions | ✅ Giữ nguyên schedule |
| Deploy lần đầu | ⚠️ Redeploy toàn bộ 13 functions (chỉ 1 lần) |

---

## 13. Deploy Troubleshooting — Tất cả lỗi đã gặp

### Error 1: `.firebase/{project}/functions` directory not found

**Triệu chứng:**
```
Error: could not deploy functions because the
".firebase/tripphuquoc-db-fs/functions" directory was not found.
```

**Root cause:** `scripts/predeploy.mjs` có `rmSync('.firebase')` → xóa toàn bộ cache bao gồm framework function build của hosting.

**Fix:** Bỏ dòng `rmSync('.firebase')` khỏi predeploy. Firebase CLI tự quản lý cache.

**Đã fix:** 2026-05-13 — `scripts/predeploy.mjs` không còn xóa `.firebase/`.

---

### Error 2: `npm ci` lock file mismatch

**Triệu chứng:**
```
npm error `npm ci` can only install packages when your package.json
and package-lock.json are in sync.
npm error Missing: @9trip/shared@1.0.0 from lock file
```

**Root cause:** Predeploy sửa `functions/package.json` (đổi `@9trip/shared` path thành `file:./vendor-shared`) nhưng `package-lock.json` vẫn giữ path workspace (`file:../packages/shared`). Firebase CLI dùng `npm ci` → yêu cầu lock file khớp tuyệt đối.

**Fix:** Thêm bước 4 vào predeploy:
```javascript
import { execSync } from 'child_process';
execSync('npm install --package-lock-only', {
  cwd: FUNCTIONS_DIR, stdio: 'inherit',
});
```

**Đã fix:** 2026-05-13 — `scripts/predeploy.mjs` giờ có 4 bước, bước 4 sync lock file.

---

### Error 3: Function type change (HTTPS → background trigger)

**Triệu chứng:**
```
Error: [api:onBookingCancelledV2(asia-southeast1)] Changing from an HTTPS
function to a background triggered function is not allowed.
```

**Root cause:** Khi đổi codebase name (`"default"` → `"api"`), Firebase CLI phát hiện function đã tồn tại với type cũ → từ chối update. Cloud Functions không cho phép đổi trigger type.

**Fix:** Xóa từng function cũ, deploy lại:
```bash
firebase functions:delete onBookingCreatedV2 --region asia-southeast1 --force
firebase functions:delete onBookingPaidV2 --region asia-southeast1 --force
firebase functions:delete onBookingCancelledV2 --region asia-southeast1 --force
firebase functions:delete onBookingModifiedV2 --region asia-southeast1 --force
firebase functions:delete onUserCreatedV2 --region asia-southeast1 --force
firebase functions:delete onPasswordChangedV2 --region asia-southeast1 --force
firebase functions:delete onUserDeletedV2 --region asia-southeast1 --force
firebase deploy --only functions,hosting
```

**7 Firestore triggers bị ảnh hưởng** (từ `triggers/bookings.js` và `triggers/users.js`). HTTP functions (`apiCore`, `apiPayments`, `apiWebhooks`) và Scheduled functions (`cleanupExpiredHolds`, `cancelAbandonedBookings`) không bị ảnh hưởng vì không đổi type.

---

### Error 4: 403 Forbidden — SSR function IAM missing

**Triệu chứng:**
- Homepage (`/` — static, CDN) → 200 OK
- `/tours`, `/hotels/*`, `/blog`, `/activities` → **403 Forbidden**
- `firebase functions:log --only ssrtripphuquocdbfs`:
  ```
  The request was not authenticated. Either allow unauthenticated invocations
  or set the proper Authorization header.
  ```

**Root cause:** SSR function bị mất IAM `allUsers` invoker. Cloud Run (backing v2 Cloud Functions) mặc định yêu cầu authentication. Firebase CLI chỉ set `allUsers` invoker khi **CREATE** function, không re-apply khi **UPDATE**.

**Fix:**
```bash
# Xóa SSR function
firebase functions:delete ssrtripphuquocdbfs --region asia-southeast1 --force

# Deploy lại hosting → CREATE mới với IAM đúng
firebase deploy --only hosting
```

**Đã fix:** 2026-05-13 — SSR function được recreate, IAM policy đã được set đúng.

**Prevention:** Sau mỗi lần deploy, test ít nhất 1 dynamic page:
```bash
curl -sI https://tripphuquoc-db-fs.web.app/tours | grep "HTTP/2 200"
```

---

### Error 5: ENOSPC — Disk full

**Triệu chứng:**
```
Error: ENOSPC: no space left on device, write
```
Xảy ra trong lúc `preparing ... directory for uploading`.

**Root cause:** `/tmp` đầy (Firebase CLI dùng `/tmp` để staging khi upload). Có thể do deploy thất bại nhiều lần để lại temp files, hoặc system temp tích lũy.

**Fix:**
```bash
# Kiểm tra
df -h /tmp

# Dọn dẹp
rm -rf /tmp/opencode/* /tmp/firebase-* /tmp/npm-*

# Dọn thêm cache nặng
rm -rf .firebase .next
```

**Ngưỡng an toàn:** `/tmp` cần ≥ 500MB trống cho functions deploy, ≥ 2GB cho full deploy.

---

## 14. Predeploy Script Standards

### Cấu trúc chuẩn (`scripts/predeploy.mjs`)

```javascript
import { execSync } from 'child_process';
import { rmSync, cpSync, readFileSync, writeFileSync } from 'fs';

const ROOT = join(__dirname, '..');
const FUNCTIONS_DIR = join(ROOT, 'functions');
const SHARED_DIR = join(ROOT, 'packages', 'shared');
const VENDOR_SHARED_DIR = join(FUNCTIONS_DIR, 'vendor-shared');
const PKG_PATH = join(FUNCTIONS_DIR, 'package.json');

try {
  // B1: Clean vendor-shared cũ
  rmSync(VENDOR_SHARED_DIR, { recursive: true, force: true });
  
  // B2: Copy shared code
  cpSync(SHARED_DIR, VENDOR_SHARED_DIR, { recursive: true });
  
  // B3: Ensure package.json points to local shared
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  pkg.dependencies['@9trip/shared'] = 'file:./vendor-shared';
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, '\t') + '\n');
  
  // B4: Sync lock file — CRITICAL for npm ci
  execSync('npm install --package-lock-only', {
    cwd: FUNCTIONS_DIR, stdio: 'inherit',
  });
} catch (err) {
  console.error('[predeploy] Error:', err.message);
  process.exit(1);
}
```

### ✅ MUST DO

| # | Quy tắc | Lý do |
|---|---------|-------|
| 1 | Luôn sync `package-lock.json` sau khi sửa `package.json` | Firebase CLI dùng `npm ci` khi deploy |
| 2 | Dùng `npm install --package-lock-only` (không install thật) | Nhanh (<2s), đủ để sync lock file |
| 3 | Log từng bước (`console.log`) | Dễ debug khi deploy fail |
| 4 | Exit code 1 nếu lỗi | Firebase CLI cần biết predeploy fail |

### ❌ MUST NOT DO

| # | Quy tắc | Lý do |
|---|---------|-------|
| 1 | **Không** xóa `.firebase/` | Firebase CLI tự quản lý cache; xóa nó phá hủy framework function build |
| 2 | **Không** xóa `functions/node_modules/` | Làm chậm deploy, có thể gây lỗi |
| 3 | **Không** sửa `firebase.json` động | Firebase CLI parse file này trước khi chạy predeploy |
| 4 | **Không** nuốt exception (`catch(e) {}`) | Phải log và exit 1 |
| 5 | **Không** chạy `npm ci` hoặc `npm install` đầy đủ trong predeploy | Quá chậm, không cần thiết |

---

## 15. Deploy Stability Checklist

### Pre-deploy (BẮT BUỘC mỗi lần)

- [ ] **Disk space:** `df -h /tmp` ≥ 2GB
- [ ] **Lock file:** `grep '@9trip/shared' functions/package-lock.json` → thấy `"file:./vendor-shared"`
- [ ] **Codebase:** `firebase.json` → `functions[0].codebase` ≠ `"default"`
- [ ] **Predeploy exists:** `ls scripts/predeploy.mjs`
- [ ] **Dry run** (nếu sửa functions): `firebase deploy --only functions --dry-run`

### Deploy commands (theo thứ tự an toàn)

```bash
# Cách 1: Deploy từng phần (an toàn nhất)
firebase deploy --only functions    # Custom functions trước (~3-5 phút)
firebase deploy --only hosting      # Hosting + SSR function sau (~5-8 phút)

# Cách 2: Deploy cùng lúc (codebase separation đã fix conflict)
firebase deploy --only functions,hosting    # ~8-12 phút
```

### Post-deploy verification (BẮT BUỘC)

```bash
# 1. Homepage (static — CDN)
curl -sI https://tripphuquoc-db-fs.web.app/ | grep "HTTP/2 200"

# 2. Dynamic page (SSR function)
curl -sI https://tripphuquoc-db-fs.web.app/tours | grep "HTTP/2 200"

# 3. SSG page
curl -sI https://tripphuquoc-db-fs.web.app/blog | grep "HTTP/2 200"

# 4. API rewrite (custom functions)
curl -sI https://tripphuquoc-db-fs.web.app/api/contact | grep -E "HTTP/2 [23]"
```

### Nếu thấy 403 — Emergency fix

```bash
# 1. Xác nhận lỗi IAM
firebase functions:log --only ssrtripphuquocdbfs | tail -5
# Nếu có "The request was not authenticated":

# 2. Recreate SSR function
firebase functions:delete ssrtripphuquocdbfs --region asia-southeast1 --force
firebase deploy --only hosting
```

---

## 16. Deploy Command Reference

### Deploy từng phần

| Command | Nội dung | ~Thời gian |
|---------|----------|-----------|
| `firebase deploy --only functions` | 13 custom functions (codebase `api`) | 3-5 phút |
| `firebase deploy --only hosting` | Static files + SSR function (`ssrtripphuquocdbfs`) | 5-8 phút |
| `firebase deploy --only functions,hosting` | Tất cả | 8-12 phút |

### Troubleshooting

| Command | Mục đích |
|---------|----------|
| `firebase deploy --only functions --dry-run` | Test predeploy + package, không deploy thật |
| `firebase functions:log --only ssrtripphuquocdbfs` | Xem log SSR function |
| `firebase functions:log --only apiCore` | Xem log custom function |
| `firebase functions:delete <name> --region asia-southeast1 --force` | Xóa function bị lỗi |
| `firebase functions:list` | Liệt kê tất cả functions đã deploy |
| `firebase hosting:channel:list` | Xem preview channels |

### Emergency full reset

```bash
rm -rf .firebase .next            # Dọn cache
firebase deploy --only hosting --force    # Deploy hosting trước
firebase deploy --only functions --force  # Deploy functions sau
```

---

## 17. Function Inventory & Architecture (2026-05-13)

### Codebase `api` — 13 functions

| # | Function | Type | Source file | Ghi chú |
|---|----------|------|-------------|---------|
| 1 | `apiCore` | HTTP (onRequest) | `src/apps/index.js` | Bookings, availability, email, auth, contact, cart |
| 2 | `apiPayments` | HTTP (onRequest) | `src/apps/index.js` | Payment creation, retry, MoMo |
| 3 | `apiWebhooks` | HTTP (onRequest) | `src/apps/index.js` | ERP, payment gateway callbacks |
| 4 | `cleanupExpiredHolds` | Scheduled (onSchedule) | `index.js:172` | Every 5 minutes |
| 5 | `cancelAbandonedBookings` | Scheduled (onSchedule) | `index.js:179` | Every 60 minutes |
| 6 | `chatWithEmily` | Callable (onCall) | `index.js:190` | AI chat |
| 7 | `onUserCreatedV2` | Firestore trigger | `triggers/users.js` | onDocumentCreated |
| 8 | `onPasswordChangedV2` | Firestore trigger | `triggers/users.js` | onDocumentUpdated |
| 9 | `onUserDeletedV2` | Firestore trigger | `triggers/users.js` | onDocumentDeleted |
| 10 | `onBookingCreatedV2` | Firestore trigger | `triggers/bookings.js` | onDocumentCreated |
| 11 | `onBookingPaidV2` | Firestore trigger | `triggers/bookings.js` | onDocumentUpdated |
| 12 | `onBookingCancelledV2` | Firestore trigger | `triggers/bookings.js` | onDocumentUpdated |
| 13 | `onBookingModifiedV2` | Firestore trigger | `triggers/bookings.js` | onDocumentUpdated |

### Codebase `firebase-frameworks-tripphuquoc-db-fs` — 1 function

| # | Function | Type | Ghi chú |
|---|----------|------|---------|
| 1 | `ssrtripphuquocdbfs` | HTTP (Next.js SSR) | Auto-managed by Firebase CLI |

**Tổng: 14 functions / 2 codebases độc lập.**

### Cấu trúc thư mục

```
tripphuquoc-db-fs/
├── firebase.json              # hosting (frameworksBackend) + functions[codebase: "api"]
├── next.config.mjs            # serverExternalPackages, images config
├── functions/                 # Custom functions — codebase "api"
│   ├── package.json           # @9trip/shared: "file:./vendor-shared"
│   ├── package-lock.json      # Sync bởi predeploy
│   ├── index.js               # Entry: 3 direct exports + 4 re-exports
│   ├── vendor-shared/         # Copy of packages/shared (predeploy)
│   └── src/
│       ├── apps/              # apiCore, apiPayments, apiWebhooks (Express)
│       ├── triggers/          # bookings.js, users.js
│       └── scheduled/         # cleanup.js
├── scripts/
│   ├── predeploy.mjs          # 4 steps: clean → copy → update pkg → sync lock
│   └── postdeploy.mjs         # Restore package.json, clean vendor-shared
├── packages/shared/           # @9trip/shared (npm workspace)
└── src/                       # Next.js app (App Router)
