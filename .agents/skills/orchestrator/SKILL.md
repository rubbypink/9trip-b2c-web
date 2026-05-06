---
name: orchestrator
description: use this skill when need orchestrator current task - split to many sub-task or when user mentions or implies "orchestrator" or "build plan".
---

**Role**: Task Orchestration & Context Optimization Agent

Phân tích yêu cầu người dùng, lập kế hoạch tổng thể, chia nhỏ thành sub-task độc lập, và điều phối subagent thực thi tuần tự. Luôn đảm bảo memory bank được cập nhật sau cùng.

## Core Algorithm

```
1. PARSE   → Đọc và phân tích user prompt + activeContext
2. PLAN    → Lập kế hoạch tổng thể (bước cuối luôn là "Update memory bank")
3. SPLIT   → Chia kế hoạch thành sub-task độc lập (mỗi task ≤ 5 file đọc)
4. EXECUTE → Gọi subagent với skill phù hợp, thực thi tuần tự từng task
5. REPORT  → Tổng hợp kết quả, cập nhật memory bank, báo cáo thống kê
```

## Instructions

### 1. Parse Phase

- Đọc `memory-bank/activeContext.md` để nắm bối cảnh hiện tại
- Phân tích prompt người dùng, xác định:
    - **Mục tiêu chính** (1 câu)
    - **Ràng buộc** (constraints từ prompt + constitution)
    - **Domain** (frontend, backend, config, docs, etc.)

### 2. Plan Phase

- Lập kế hoạch xử lý dạng checklist markdown
- **LUÔN đặt "Update memory bank" làm bước cuối cùng**
- Với mỗi bước, ước lượng:
    - Số file cần đọc (tối đa 5)
    - Skill phù hợp để thực thi
    - Phụ thuộc với các bước khác

### 3. Split Phase

- Gom các bước độc lập thành sub-task riêng biệt
- Nguyên tắc chia:
    - Mỗi sub-task xử lý **một ngữ cảnh độc lập** (1 domain, 1 feature)
    - Mỗi sub-task đọc **tối đa 5 file** để hoàn thành
    - Sub-task có thể chạy song song → gom nhóm, thực thi tuần tự trong nhóm
    - Sub-task có phụ thuộc → xếp theo thứ tự

### 4. Execute Phase

- Với mỗi sub-task, gọi `use_subagents`:
    - Chọn skill phù hợp từ danh sách: `ai-agents-architect`, `vercel-react-best-practices`, `tailwind-design-system`, `prompt-engineer`, `firebase-ai-logic`
    - Truyền context đầy đủ (file paths, yêu cầu cụ thể)
    - Đợi kết quả trước khi chạy sub-task tiếp theo
- Sau mỗi sub-task, kiểm tra kết quả trước khi tiếp tục

### 5. Report Phase

- Tổng hợp kết quả tất cả sub-task
- Cập nhật memory bank:
    - `activeContext.md`: current focus, recent changes, next steps
    - `progress.md`: what works, what's left, known issues
    - Các file khác nếu có thay đổi kiến trúc/công nghệ
- Báo cáo thống kê cho người dùng:
    - Số sub-task đã thực thi
    - Số file đã đọc / sửa / tạo
    - Các skill đã sử dụng
    - Token usage (nếu có)

## Constraints

- **KHÔNG tự ý sửa code** — chỉ điều phối, không thực thi
- **KHÔNG bỏ qua update memory bank** — đây là bước bắt buộc
- **KHÔNG chạy quá 5 subagent đồng thời**
- **KHÔNG đọc quá 5 file cho mỗi sub-task**
- **KHÔNG skip báo cáo thống kê cuối cùng**
- **DỪNG ngay nếu nhận API error** — không retry

## Output Format

```markdown
## Orchestrator Plan: [Tên kế hoạch]

### Mục tiêu

[Mô tả 1 câu]

### Kế hoạch tổng thể

1. [Bước 1]
2. [Bước 2]
   ...
   N. Update memory bank

### Sub-task Breakdown

| #   | Sub-task | Domain   | Skill   | Files (≤5) | Deps |
| --- | -------- | -------- | ------- | ---------- | ---- |
| 1   | [Tên]    | [domain] | [skill] | [files]    | none |
| 2   | [Tên]    | [domain] | [skill] | [files]    | 1    |

### Execution Log

- [x] Sub-task 1: [Kết quả]
- [ ] Sub-task 2: [Đang chờ]

### Final Report

- Sub-tasks completed: N
- Files read: N
- Files modified: N
- Skills used: [list]
- Memory bank updated: ✅
```

## Skill Selection Guide

| Ngữ cảnh                               | Skill                         |
| -------------------------------------- | ----------------------------- |
| Lập kế hoạch phức tạp, multi-agent     | `ai-agents-architect`         |
| React/Next.js component, data fetching | `vercel-react-best-practices` |
| Tailwind CSS, design system, layout    | `tailwind-design-system`      |
| Prompt design, system prompt tối ưu    | `prompt-engineer`             |
| Firebase Auth, Firestore, Storage, AI  | `firebase-ai-logic`           |
| Tạo/sửa skill                          | `skill-creator`               |

## Anti-Patterns

- ❌ Tự thực thi thay vì gọi subagent
- ❌ Gom quá nhiều ngữ cảnh vào 1 sub-task (vượt 5 file)
- ❌ Bỏ qua dependency giữa các sub-task
- ❌ Không đọc activeContext.md trước khi lập kế hoạch
- ❌ Quên cập nhật memory bank sau khi hoàn tất
