# Assistant knowledge — Tri thức trợ lý — maintenance note

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-29
>
> **Change summary:** Thêm xử lý phạm vi chi nhánh: 403 `ASSISTANT_BRANCH_SCOPE_DENIED` và 404 ngoài phạm vi có thông điệp riêng; 404 tải lại danh sách.

## Phạm vi

Chọn bài CMS nào trợ lý được dùng để trả lời, cho đối tượng nào (`PUBLIC|CUSTOMER|STAFF|ADMIN`) và chi nhánh
nào (bỏ trống = tất cả chi nhánh); xuất bản (dựng chỉ mục) và lưu trữ.

Ngoài phạm vi: tài liệu nhập tay (`MANUAL` chỉ hiển thị), đổi đối tượng/chi nhánh của tài liệu đã gắn (V1 chưa
có), reindex thủ công, cấu hình trợ lý (nằm ở Tham số hệ thống, nhóm "Trợ lý AI").

## Route, menu, entry

- Route `/assistant-knowledge`, menu "Tri thức trợ lý" (nhóm Nội dung & trải nghiệm), gate
  `assistant.knowledge.manage` (một mã cho cả màn và mọi lệnh).
- Public entry: `KnowledgePage` (`index.ts`). Bộ lọc trạng thái/đối tượng/chi nhánh nằm trên URL.

## Generated operation và mapping

- `src/generated/api/assistant`: `useListAdminKnowledgeDocuments`, `attachAdminKnowledgePost`,
  `publishAdminKnowledgeDocument`, `archiveAdminKnowledgeDocument`.
- Ô chọn bài dùng `listAdminPosts` của `src/generated/api/content` — đòi `cms.content.view`; thiếu quyền thì
  modal cảnh báo và khoá. Endpoint này chưa tìm theo tiêu đề nên ô chọn tắt gõ tìm, lọc theo loại bài + cuộn
  tải thêm. Bài ARCHIVED bị khoá.
- `model/knowledge-document.mapper.ts`: DTO ↔ view model/params; chi nhánh trống gửi `branchId: null`.
- DTO chỉ có `sourceType` + `sourceId` (không có tiêu đề bài gốc) và `branchId` (không có tên); tên chi nhánh
  tra qua `useBranchLabels` của `@/features/organization`.

## Vòng đời, concurrency, idempotency

| Lệnh | Trạng thái hợp lệ | Ghi chú |
| --- | --- | --- |
| Gắn bài CMS | — | Tạo tài liệu DRAFT. Gắn lại cùng bài + cùng phạm vi trả tài liệu cũ; khác phạm vi → 409 `KNOWLEDGE_ALREADY_ATTACHED` |
| Xuất bản | DRAFT, ARCHIVED | Dựng lại chỉ mục; bài nguồn phải PUBLISHED và đang hiển thị, nếu không → `KNOWLEDGE_SOURCE_NOT_VISIBLE` |
| Lưu trữ | DRAFT, PUBLISHED | Trợ lý ngừng dùng; bài CMS gốc không đổi |

- Publish/archive gửi `expectedVersion` (số) của dòng đang hiển thị; `KNOWLEDGE_VERSION_CONFLICT` /
  `KNOWLEDGE_INVALID_TRANSITION` → invalidate danh sách và báo người dùng xem lại.
- Các endpoint này **không** nhận `Idempotency-Key` (không có override `apiFetcherWithOptions`); attach
  idempotent theo khoá tự nhiên, publish/archive theo version.
- Thành công: invalidate `getListAdminKnowledgeDocumentsQueryKey()`.

## Phạm vi chi nhánh (SECURITY)

API chặn phạm vi trên mọi route tri thức; UI không tự lọc hay ẩn theo chi nhánh.

- Tài khoản toàn hệ thống (GLOBAL) thấy và quản lý mọi tài liệu, kể cả tài liệu "tất cả chi nhánh".
- Tài khoản theo chi nhánh chỉ thấy tài liệu của chi nhánh mình. Gắn cho chi nhánh khác hoặc cho "tất cả chi
  nhánh" trả 403 `ASSISTANT_BRANCH_SCOPE_DENIED`; tài khoản chưa được gán chi nhánh nào cũng nhận 403.
- Tài liệu ngoài phạm vi trả 404 `KNOWLEDGE_DOCUMENT_NOT_FOUND` như không tồn tại. UI báo "không tìm thấy trong
  phạm vi chi nhánh" (không đoán lý do) và tải lại danh sách.
- Thông điệp theo mã nằm ở `model/knowledge-command-error.ts` (`attachKnowledgeErrorMessage`,
  `knowledgeTransitionErrorMessage`), có test.

## Trạng thái UI

Loading bảng, lỗi `QueryErrorAlert` có Thử lại, rỗng "Chưa có tài liệu phù hợp bộ lọc.". Publish/archive xác
nhận bằng `modal.confirm` hiện trạng thái hiện tại, phiên bản và hệ quả; lỗi giữ modal mở và toast thông điệp theo
mã. Modal gắn bài chỉ đóng khi thành công.

## Kiểm thử / checklist khi sửa

- Test: `model/knowledge-actions.policy.test.ts`, `knowledge-document.mapper.test.ts`, `knowledge-command-error.test.ts`.
- Đổi contract: `yarn contracts:sync && yarn generate:api`, sửa mapper, không sửa `src/generated`.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.1.0 | 2026-09-29 | Xử lý 403 branch scope / 404 ngoài phạm vi; ghi nhận test. | feat/assistant-v1 review fixes |
| 1.0.0 | 2026-09-29 | Tạo feature và nối SDK assistant. | feat/assistant-v1 |
