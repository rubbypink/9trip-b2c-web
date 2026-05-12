## Goal
- Fix SSR 500 errors on hotels, tours, and detail pages in a Next.js 16 + Firebase project deployed to Firebase Hosting with `frameworksBackend` (Cloud Functions runtime).

## Constraints & Preferences
- Use modern modular Firebase Admin SDK pattern (`firebase-admin/app`, `firebase-admin/firestore`)
- Add `dotenv.config()` to load `.env.local` in Cloud Functions (does not auto-load)
- Wrap `generateMetadata` in try-catch on all detail pages
- Use `notFound()` consistently instead of returning JSX for missing data
- Keep all existing function signatures and backward compatibility

## Progress
### Done
- Refactored `packages/shared/firebase/admin-init.js` to modular SDK (getApps, initializeApp, cert, getFirestore, getAuth, getStorage)
- Added `getAdminDb()`, `getAdminAuth()`, `getAdminStorage()` exports
- Refactored `src/lib/storage-admin.js` to use modular SDK
- Refactored `src/lib/firestore-admin.js` to use `getAdminDb()` pattern, replaced `admin.firestore.FieldValue` with `FieldValue`
- Added `dotenv.config()` in `src/lib/firebase-admin.js` (Fix #1)
- Wrapped `generateMetadata` in try-catch for hotel, tour, room detail pages (Fix #2)
- Changed hotel detail page null check to use `notFound()` instead of JSX return
- Exported `getAdminDb`, `getAdminAuth`, `getAdminStorage` from `src/lib/firebase-admin.js`
- Installed `dotenv` dependency (was in package.json but not installed)
- **CRITICAL FIX**: Discovered `.env.local` is NOT copied to deployed Cloud Functions by Firebase CLI. Created `.env.default` (for frameworksBackend SSR function) and `functions/.env` (for custom Cloud Functions). Both are gitignored.
- Build passes successfully

### In Progress
- Deploying to Firebase and verifying with agent-browser

### Blocked
- None

## Key Decisions
- Refactored to modular Firebase Admin SDK instead of namespace import for better tree-shaking and modern patterns
- `dotenv.config()` placed at module-level in `src/lib/firebase-admin.js` (earliest entry point) rather than `instrumentation.ts` for simplicity
- Collection helper functions (toursCol, hotelsCol, etc.) changed to call `getAdminDb()` internally instead of using module-level `adminDb` variable
- **Environment Variables**: Firebase CLI copies `.env` and `.env.<project_alias>` to deployed functions, but NOT `.env.local`. Since alias is "default", created `.env.default` in project root and `functions/.env` for custom functions.

## Next Steps
1. Deploy to Firebase (`firebase deploy` or `firebase deploy --only hosting,functions`)
2. Use agent-browser to verify pages load without 500 errors
3. Check Firebase Functions logs for any remaining issues

## Critical Context
- **Firebase Hosting Frameworks (Next.js) is in "early public preview"** and new participation has been CLOSED permanently. Google recommends graduating to "App Hosting".
- **Cloud Functions runtime does NOT auto-load `.env.local`** — this was the root cause of 500 errors
- `.env.local` is for LOCAL emulator only. For deployed functions, use `.env` or `.env.<project_alias>` (e.g., `.env.default` since alias is "default")
- Alternative: Use `firebase functions:secrets:set` + configure `frameworksBackend.secrets` in firebase.json for sensitive values
- `firebase.json` uses `frameworksBackend` (deploys Next.js SSR as Cloud Functions in asia-southeast1)
- `serverExternalPackages: ['firebase-admin']` in `next.config.mjs`
- Custom Cloud Functions in `functions/` directory are SEPARATE from the frameworksBackend auto-generated SSR function

## Relevant Files
- `src/lib/firebase-admin.js`: Entry point — loads dotenv, exports adminDb/adminAuth/getAdminDb/getAdminAuth/getAdminStorage
- `packages/shared/firebase/admin-init.js`: Core init — modular SDK, getAdminDb/getAdminAuth/getAdminStorage helpers
- `src/lib/firestore-admin.js`: Data layer — refactored to getAdminDb() pattern, removed adminDb export
- `src/lib/storage-admin.js`: Storage — modular SDK, getApps/getApp/getStorage
- `src/app/hotels/[slug]/page.js`: Hotel detail — notFound() fallback, generateMetadata try-catch
- `src/app/tours/[slug]/page.js`: Tour detail — notFound() fallback, generateMetadata try-catch
- `src/app/hotels/[slug]/rooms/[roomId]/page.js`: Room detail — generateMetadata try-catch
- `src/app/api/agents/tasks/[id]/route.js`: Updated to use getAdminDb() pattern
- `.env.default`: Copy of .env.local for Firebase CLI to copy to deployed SSR function
- `functions/.env`: Copy of .env.local for custom Cloud Functions
- `package.json`: dotenv ^17.4.2, firebase-admin ^13.8.0, next 16.2.4
- `.env.local`: Contains Firebase Admin credentials (APP_FIREBASE_PRIVATE_KEY, etc.)
- `.gitignore`: `.env*` is already ignored (line 49)

## 1. User Requests (As-Is)
- "phân tích codebase để fix lỗi các page hotels, tours và các page details bị lỗi 500. Hãy kết hợp xem xét các ý kiến sau để fix lỗi:"
- Fix #1: Firebase Admin SDK duplicate init in serverless warm starts
- Fix #2: SSR Fetching missing fallback mechanism
- Fix #3: Environment Variables missing in Cloud Functions
- "Hãy cập nhật thêm để khởi tạo firebase admin theo dạng chuẩn document" with example using modular SDK pattern
- Use `getAdminDb()` pattern and `notFound()` fallback as shown in example
- "Hãy xem qua các log sau khi deploy functions vì lỗi 500 vẫn chưa được fix, hãy phân tích kỹ hơn, cẩn thận hơn, sau khi fix, chạy firebase deploy --only functions rồi chờ kết quả -> chạy agent-browser để kiểm tra thực tế xem còn lỗi hay không."

## 2. Final Goal
- Eliminate SSR 500 errors on all hotels, tours, and detail pages
- Refactor Firebase Admin to modern modular SDK pattern
- Ensure `.env.local` loads in Cloud Functions runtime
- Add defensive error handling (try-catch, notFound()) across all SSR detail pages
- Maintain backward compatibility with existing code

## 3. Work Completed
- **packages/shared/firebase/admin-init.js**: Refactored from `import admin from 'firebase-admin'` to modular imports (`firebase-admin/app`, `firebase-admin/firestore`, `firebase-admin/auth`, `firebase-admin/storage`). Added `getAdminDb()`, `getAdminAuth()`, `getAdminStorage()` exports. Updated `ensureAdminInit()` to use `getApps()`, `cert()`, `initializeApp()`.
- **src/lib/firebase-admin.js**: Added `dotenv.config()` loading at module level. Exports `getAdminDb`, `getAdminAuth`, `getAdminStorage` alongside existing `adminDb`, `adminAuth`.
- **src/lib/storage-admin.js**: Refactored to use `getApps()`, `getApp()`, `getStorage()` from modular SDK. Added initialization guard.
- **src/lib/firestore-admin.js**: Replaced `import admin from 'firebase-admin'` with `import { FieldValue } from 'firebase-admin/firestore'`. Changed collection helpers to call `getAdminDb()` internally. Added `const adminDb = getAdminDb();` to functions using `adminDb` directly. Removed `export { adminDb }`.
- **src/app/hotels/[slug]/page.js**: Wrapped `generateMetadata` in try-catch. Changed null hotel check to use `notFound()` instead of returning JSX. Added `import { notFound } from "next/navigation"`.
- **src/app/tours/[slug]/page.js**: Wrapped `generateMetadata` in try-catch.
- **src/app/hotels/[slug]/rooms/[roomId]/page.js**: Wrapped `generateMetadata` in try-catch.
- **src/app/api/agents/tasks/[id]/route.js**: Updated to use `getAdminDb()` pattern, removed broken `adminDb` import.
- **Environment Variables Fix**: Created `.env.default` (project root) and `functions/.env` from `.env.local` so Firebase CLI copies them to deployed functions. Both files are gitignored.
- Installed `dotenv` package (was missing from node_modules despite being in package.json).

## 4. Remaining Tasks
- Deploy to Firebase
- Verify with agent-browser that pages load without 500 errors
- Monitor Firebase Functions logs for any remaining issues

## 5. Active Working Context (For Seamless Continuation)
- **Files**: 
  - `.env.default`: Created from `.env.local`, gitignored, for frameworksBackend SSR function
  - `functions/.env`: Created from `.env.local`, gitignored, for custom Cloud Functions
- **State**: Ready to deploy. Build passes. Need to run `firebase deploy` or `firebase deploy --only hosting,functions`.

## 6. Explicit Constraints (Verbatim Only)
- "Sử dụng một helper khởi tạo duy nhất và an toàn"
- "Bọc toàn bộ logic lấy dữ liệu trong try-catch và trả về null thay vì để function crash"
- "hãy gọi thư viện dotenv ngay trong file cấu hình gốc"
- "Đảm bảo file .env hoặc .env.production đã được commit (nếu không chứa secret nhạy cảm) hoặc được tiêm vào lúc chạy CI/CD"

## 7. Agent Verification State
- **Current Agent**: Sisyphus (lead orchestrator)
- **Verification Progress**: LSP diagnostics clean on all changed files (zero errors). Build passes.
- **Pending Verifications**: Firebase deploy and agent-browser verification
- **Previous Rejections**: None
- **Acceptance Status**: Code fixes complete. Need deployment verification.

## 8. Delegated Agent Sessions
- **explore** (completed): Find all firebase-admin imports and usages | session: `ses_1e3d80f4dffeJ7l78hXPBL65iP`
- **Sisyphus-Junior** [visual-engineering] (completed): init-refactor | session: `ses_1e3d62875ffepBUBUTrP1vFlER`
- **Sisyphus-Junior** [visual-engineering] (completed): storage-refactor | session: `ses_1e3d62868ffezzkFJYxNvm1mCy`
- **Sisyphus-Junior** [visual-engineering] (completed): firestore-refactor | session: `ses_1e3d62845ffeMEHdWPRK5MPJUl`
- **Sisyphus-Junior** [visual-engineering] (completed): pages-refactor | session: `ses_1e3d62828ffe1ms8rNCWh3Vsw7`

## Firebase Hosting Next.js Frameworks - Official Docs Summary
### Key Points from https://firebase.google.com/docs/hosting/frameworks/nextjs

1. **Status**: Framework-aware Hosting is "early public preview". New participation CLOSED permanently. Recommendation: graduate to "App Hosting".

2. **Deployment**: `firebase deploy` builds the app, detects if backend is needed, and deploys a Cloud Function for SSR. Static content served via Firebase Hosting CDN.

3. **Environment Variables**:
   - Firebase CLI copies `.env` and `.env.*` files from project root to the functions folder during deploy
   - `.env.local` is for LOCAL emulator ONLY — NOT copied to deployed functions
   - For project-specific envs: `.env.<project_alias>` (e.g., `.env.default` since alias is "default")
   - For sensitive secrets: use `firebase functions:secrets:set` + configure `frameworksBackend.secrets` in firebase.json
   - Cloud Functions also supports `.env` file in `functions/` directory

4. **SSR Detection**: Firebase CLI detects `getServerSideProps` usage and deploys functions. For Next.js 13+ App Router, it detects dynamic routes and server components.

5. **Image Optimization**: Supported but triggers function creation even without SSR.

6. **frameworksBackend Config**: Accepts same options as `firebase-functions/v2/https.httpsOptions` (JSON-serializable):
   ```json
   {
     "hosting": {
       "source": ".",
       "frameworksBackend": {
         "region": "us-central1",
         "minInstances": 1,
         "maxInstances": 10,
         "secrets": ["MY_SECRET"]
       }
     }
   }
   ```

7. **Authentication Integration**: Express `res.locals` contains `firebaseApp` and `currentUser` in `getServerSideProps`. App Router integration may differ.

8. **next.config.js**: Firebase CLI respects redirects, rewrites, headers. If can't convert to Firebase Hosting config, falls back to building a function.

9. **Firebase Admin SDK**: Only reference in server-side contexts (`getStaticProps`, `getStaticPaths`, API routes). Will fail if bundled for browser.

10. **Multiple Lockfiles Warning**: The warning about multiple lockfiles indicates Next.js inferred workspace root. Should set `turbopack.root` in next.config or remove extra lockfiles.
