# Checkout Bug Fix & Hotel Price Schedule Migration

## TL;DR

> **Quick Summary**: Fix a critical checkout navigation bug caused by dropdown overlap and broken route middleware, alongside a destructive database migration to restructure `hotel_price_schedules` to the current schema.
> 
> **Deliverables**:
> - Fixed Header.jsx with mutually exclusive dropdowns.
> - Activated Next.js route protection (proxy.js -> middleware.js).
> - One-off Node.js migration script (backup, delete, restructure, upload).
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: T1 (Header fix) + T2 (Middleware) | T3 (Migration script)

---

## Context

### Original Request
1. Fix bug: Clicking the checkout button goes to the logout page instead.
2. Skip adding a new checkout button to the cart dropdown.
3. Database Migration: Load all `hotel_price_schedules`, delete them from Firestore, map to the current schema in `packages/shared/schemas/hotel-price-schedules.js`, and re-upload.

### Interview Summary
**Key Discussions**:
- Schema Mapping: Confirmed that mapping should strictly follow the existing `packages/shared/schemas/hotel-price-schedules.js` definition.
- Data Safety: Confirmed a local JSON backup must be created before any deletion occurs.

### Metis Review
**Identified Gaps** (addressed):
- **Document ID Preservation**: Migration script must strictly preserve original Firestore Document IDs when re-uploading to prevent breaking relations.
- **Middleware Compatibility**: Changing `proxy.js` to `middleware.js` might have downstream effects. Added verification step.
- **Mutual Exclusion vs Event Bubbling**: Header fix must address both state-based mutual exclusion and event propagation.

---

## Work Objectives

### Core Objective
Restore checkout functionality by fixing UI overlap and route protection, and successfully migrate hotel pricing data to the strict schema structure without data loss.

### Concrete Deliverables
- `src/components/layout/Header.jsx` (updated)
- `src/middleware.js` (renamed from `src/proxy.js`)
- `scripts/migrate-hotel-price-schedules.js` (new)
- `.sisyphus/backups/hotel_price_schedules_backup_*.json` (generated during execution)

### Definition of Done
- [ ] Cart and User dropdowns cannot be open simultaneously.
- [ ] Unauthenticated access to `/checkout` correctly redirects to `/login`.
- [ ] Migration script runs successfully against staging/production data, maintaining document IDs.

### Must Have
- Local JSON backup of `hotel_price_schedules` BEFORE any Firestore delete operations.
- Exact match to the `hotel-price-schedules.js` schema structure (including the `priceData` map).
- Preservation of original Document IDs during migration.

### Must NOT Have (Guardrails)
- Do NOT delete data before verifying the backup file has been successfully written and contains data.
- Do NOT modify the `packages/shared/schemas/hotel-price-schedules.js` schema file itself.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (No dedicated testing framework found).
- **Automated tests**: NO.
- **QA Policy**: Every task MUST include agent-executed QA scenarios using Playwright (UI), interactive_bash (CLI), or Bash.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Independent bug fixes vs Scripts):
├── Task 1: Fix Header Dropdown Overlap [visual-engineering]
├── Task 2: Activate Route Middleware [quick]
└── Task 3: Create Migration Script [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix
- **T1**: None
- **T2**: None
- **T3**: None

---

## TODOs

---
- [x] 1. Fix Header Dropdown Overlap

  **What to do**:
  - Update `src/components/layout/Header.jsx` to enforce mutual exclusion between the cart dropdown and the user menu dropdown.
  - When `setIsCartOpen(true)` is called, call `setIsUserMenuOpen(false)`.
  - When `setIsUserMenuOpen(true)` is called, call `setIsCartOpen(false)`.
  - Ensure that clicks inside one dropdown don't accidentally close it if the click bubbles up, or adjust click-away logic if present.

  **Must NOT do**:
  - Do not change the overall design or styling of the Header.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This is a pure React UI state management issue in a frontend component.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/layout/Header.jsx:20-22` - State declarations for the dropdowns
  - `src/components/layout/Header.jsx:111-135` - Buttons that toggle the dropdown states

  **Acceptance Criteria**:
  - [ ] Opening the cart dropdown closes the user menu.
  - [ ] Opening the user menu closes the cart dropdown.

  **QA Scenarios**:
  ```
  Scenario: Mutually exclusive dropdowns
    Tool: Playwright
    Preconditions: Application is running. User is logged in.
    Steps:
      1. Click the user avatar to open the user menu.
      2. Assert the user menu is visible.
      3. Click the cart icon to open the cart dropdown.
      4. Assert the cart dropdown is visible AND the user menu is NO LONGER visible.
    Expected Result: Only one dropdown is visible at a time.
    Failure Indicators: Both dropdowns visible simultaneously.
    Evidence: .sisyphus/evidence/task-1-mutually-exclusive-dropdowns.png
  ```

  **Commit**: YES
  - Message: `fix(ui): enforce mutual exclusion for header dropdowns`
  - Files: `src/components/layout/Header.jsx`

- [x] 2. Activate Route Middleware

  **What to do**:
  - Rename `src/proxy.js` to `src/middleware.js` to activate Next.js route protection.
  - Verify that the paths in the `matcher` array inside the file are correct for the current Next.js version (App Router).

  **Must NOT do**:
  - Do not change the logic inside the middleware unless it's broken.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: This is a simple file rename and configuration check.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/proxy.js` - The file to be renamed and checked

  **Acceptance Criteria**:
  - [ ] `src/proxy.js` is renamed to `src/middleware.js`.
  - [ ] Unauthenticated access to `/checkout` redirects to `/login`.

  **QA Scenarios**:
  ```
  Scenario: Middleware redirects unauthenticated users
    Tool: Bash (curl)
    Preconditions: Next.js dev server is running.
    Steps:
      1. curl -I http://localhost:3000/checkout
      2. Assert response status is 307 or 308 (redirect) or 302
      3. Assert the location header contains `/login`
    Expected Result: Unauthenticated request to /checkout is redirected to /login.
    Failure Indicators: HTTP 200 OK for /checkout without auth.
    Evidence: .sisyphus/evidence/task-2-middleware-redirect.txt
  ```

  **Commit**: YES
  - Message: `fix(core): activate next.js middleware for route protection`
  - Files: `src/middleware.js` (and the deletion of `src/proxy.js`)

- [x] 3. Create Migration Script

  **What to do**:
  - Create `scripts/migrate-hotel-price-schedules.js` (Node.js script using Firebase Admin SDK).
  - The script must perform these steps IN THIS EXACT ORDER:
    1. Fetch ALL documents from `hotel_price_schedules` collection.
    2. Write them to `.sisyphus/backups/hotel_price_schedules_backup_[timestamp].json`.
    3. Wait for confirmation or proceed automatically if backup succeeds.
    4. Delete all existing documents in the collection (batch delete).
    5. Map the old data to the new structure strictly following `packages/shared/schemas/hotel-price-schedules.js`.
    6. Write the transformed documents back to Firestore in batches, PRESERVING the original document IDs.

  **Must NOT do**:
  - Do not proceed with deletion if the backup file fails to write or is empty.
  - Do not change the document IDs.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires careful data transformation, handling of Firebase Admin SDK batch operations, and file I/O for backups.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `packages/shared/schemas/hotel-price-schedules.js` - The target schema definition.
  - Existing data structure in Firestore (script needs to analyze this before transforming).

  **Acceptance Criteria**:
  - [ ] Script successfully backs up data to `.sisyphus/backups/`.
  - [ ] Script transforms data to match the new schema.
  - [ ] Script successfully re-uploads data to Firestore.

  **QA Scenarios**:
  ```
  Scenario: Migration script execution
    Tool: interactive_bash
    Preconditions: Firebase emulator or dev project is accessible.
    Steps:
      1. Run the migration script: `node scripts/migrate-hotel-price-schedules.js`
      2. Verify the backup file was created in `.sisyphus/backups/` and contains valid JSON.
      3. Verify the script outputs success messages for deletion and re-upload.
      4. Fetch a sample document from Firestore and verify its structure matches `packages/shared/schemas/hotel-price-schedules.js`.
    Expected Result: Script completes without errors, backup exists, new data is correctly structured.
    Failure Indicators: Script crashes, backup missing, data structure incorrect.
    Evidence: .sisyphus/evidence/task-3-migration-success.txt
  ```

  **Commit**: YES
  - Message: `feat(script): add hotel price schedule migration script`
  - Files: `scripts/migrate-hotel-price-schedules.js`
## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
- [x] F2. **Code Quality Review** — `unspecified-high`
- [x] F3. **Real Manual QA** — `unspecified-high`
- [x] F4. **Scope Fidelity Check** — `deep`

## Commit Strategy
- **1**: `fix(ui): resolve header dropdown overlap` - src/components/layout/Header.jsx
- **2**: `fix(core): activate next.js middleware` - src/middleware.js
- **3**: `feat(script): add hotel price schedule migration` - scripts/migrate-hotel-price-schedules.js