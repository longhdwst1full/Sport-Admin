# Admin feature maintenance notes

> **Rule version:** 1.1.0
>
> **Last updated:** 2026-09-09
>
> **Change summary:** Bắt buộc đọc/cập nhật feature note và chuẩn hóa comment quyết định khó trong code Admin để người sau truy vết, sửa và kiểm thử an toàn.

## 1. Đọc trước khi sửa

- Trước khi sửa một feature, đọc `src/features/<feature>/README.md`, route/menu liên quan, generated operation đang dùng và comment quyết định nằm sát đoạn code sẽ đổi.
- Nếu README hoặc comment mâu thuẫn với code/contract hiện tại, coi đó là dấu hiệu cần review; xác minh source of truth rồi cập nhật note trong cùng task, không âm thầm bỏ qua.
- Feature có nhiều page/component, CRUD/workflow, permission, lifecycle hoặc mapping DTO không hiển nhiên phải có `src/features/<feature>/README.md`.

## 2. Nội dung README của feature

README phải đủ ngắn để đọc trước khi sửa nhưng tối thiểu nêu:

- mục tiêu, phạm vi và out-of-scope;
- route, menu và public entry của feature;
- generated API operation/DTO được dùng; nơi mapping API ↔ form/view model;
- permission và branch/warehouse scope; action nào chỉ ẩn ở UI và action nào vẫn phải được backend chặn;
- chủ sở hữu server state, form state và workflow/UI state;
- query key, cache invalidation/refetch sau mutation và optimistic concurrency/version nếu có;
- CRUD/lifecycle hợp lệ, confirm dialog và các trạng thái loading/empty/error/forbidden/disabled/success;
- component/story quan trọng, test/evidence và checklist ảnh hưởng khi sửa.

Không chép nguyên OpenAPI hoặc mô tả từng file. README là bản đồ bảo trì và quyết định của feature, không phải tài liệu cú pháp.

## 3. Comment/JSDoc trong code

- Component/hook/mapper/workflow quan trọng phải có JSDoc ngắn khi trách nhiệm, input/output đặc biệt hoặc invariant không thể suy ra đầy đủ từ type/name.
- Mọi nhánh xử lý không hiển nhiên liên quan permission, DTO mapping, cache invalidation, stale edit hoặc destructive confirmation phải có comment quyết định tại điểm thực thi.
- Comment đặt sát quyết định khó và giải thích **vì sao**, điều kiện áp dụng, hậu quả nếu đổi; không lặp lại tên hàm, JSX hoặc cú pháp hiển nhiên.
- Dùng prefix có thể tìm kiếm khi hữu ích:
  - `PERMISSION:` UI chỉ kiểm soát affordance nào; backend vẫn là source of truth.
  - `CONTRACT:` mapping, snapshot hoặc khác biệt giữa generated DTO và form/view model.
  - `CACHE:` query key nào phải invalidate/refetch và lý do.
  - `CONCURRENCY:` expected version, stale edit hoặc cách xử lý `409`.
  - `UX:` quyết định không hiển nhiên về disabled/loading/error/confirmation.
  - `WORKAROUND:` nguyên nhân, phạm vi, điều kiện hoặc issue để gỡ bỏ.
- TODO không được mơ hồ. Ghi điều kiện hoàn thành hoặc issue/decision liên quan; xóa comment khi workaround đã được loại bỏ.

Ví dụ:

```ts
// CONCURRENCY: Gửi version đã load để API từ chối bản sửa cũ thay vì ghi đè thay đổi của nhân viên khác.
payload.version = detail.version;

// CACHE: Cập nhật trạng thái làm thay đổi cả detail và server-filtered list, vì vậy phải invalidate hai query family.
```

## 4. Đồng bộ khi thay đổi

- Khi behavior, route, API contract, permission, lifecycle, DTO mapping, state owner hoặc cache policy thay đổi, cập nhật README/comment liên quan trong cùng task.
- Comment không thay thế Storybook, test, acceptance criteria hoặc tài liệu contract. Component/layout dùng lại phải có story cho state quan trọng theo rule chất lượng Admin.
- Không thêm comment hoặc sửa tay `contracts/` và `src/generated/api`; sửa OpenAPI producer, sync contract rồi regenerate.
- Review trước handoff phải kiểm tra: note còn đúng, comment không dư/thừa, link/operation tồn tại và không còn TODO không có điều kiện đóng.

## Revision history

| Version | Date | Change summary | Source / Change ID |
| --- | --- | --- | --- |
| 1.1.0 | 2026-09-09 | Bổ sung quy trình đọc trước khi sửa, nội dung README và comment prefix dành riêng cho Admin. | Maintainability rule review |
