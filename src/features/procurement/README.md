# Admin Procurement — maintenance note

> **Document version:** 1.3.0
>
> **Last updated:** 2026-10-10
>
> **Change summary:** Tab đang mở, ô tìm, bộ lọc và trang nằm trên URL (chỉ mount tab đang chọn); khung danh sách/lệnh/lưu nháp dùng chung (`ProcurementListPanel`, `useProcurementListState`, `useDocumentCommand`, `useDocumentSave`); lookup tách theo loại và chỉ chạy khi form mở; trạng thái qua `StatusTag` + presentation map; huỷ chứng từ qua `useConfirmWithReason`.

## Phạm vi

- Route `/procurement`, menu **Nhập hàng & NCC**, lazy-load qua `features/procurement/index.ts`.
- Bốn tab: nhà cung cấp, đơn mua hàng, phiếu nhập và trả nhà cung cấp.
- Danh sách lọc/phân trang server-side; form tạo/sửa; drawer chi tiết; action lifecycle có xác nhận.
- Không có hard-delete. Nhà cung cấp đổi ACTIVE/INACTIVE; chứng từ đi qua endpoint transition riêng.
- Trạng thái hiện tại: lint/unit/build pass; chưa có UAT trình duyệt hoặc Playwright riêng cho feature. Backlog và acceptance: [Procurement closeout](../../../_plans/2026-09-30-procurement-closeout.md).

## Contract và state

- SDK: `src/generated/api/procurement/procurement.ts`, sinh từ `contracts/admin/procurement.yaml`.
- TanStack Query sở hữu server state; Ant Design Form sở hữu dữ liệu drawer trong phạm vi feature.
- Ba create command PO/receipt/return giữ `Idempotency-Key` theo chữ ký payload; sửa/transition gửi `expectedVersion`.
- Lookup SKU và kho dùng active-search API; danh sách NCC chỉ lấy ACTIVE. NCC/PO/receipt/SKU/kho tìm server-side nhưng dropdown hiện chỉ có trang đầu theo từ khoá; không coi là hoàn tất phân trang lookup.
- Với phiếu nhập `WITH_PO`, detail PO sở hữu danh sách dòng chọn, SKU, giá tham chiếu và `remainingQty`; mapper tự khởi tạo dòng còn nhận. Không nhập `purchaseOrderItemId` bằng tay. Số còn nhận trên FE chỉ là snapshot; Backend kiểm lại dưới transaction/lock lúc post.
- Phiếu trả lọc danh sách receipt đã post theo NCC/kho đang chọn; chưa có API/UI riêng cho số SKU còn được trả sau các phiếu trả khác.
- Backend vẫn là nguồn kiểm tra permission, branch scope, maker-checker, dung sai, tồn và lock.

## Permission

- Màn hình: `purchase.order.view`.
- NCC: `supplier.manage`.
- PO: `purchase.order.create`, `purchase.order.approve`, `purchase.order.approve.finance`.
- Phiếu nhập: `purchase.receipt.create`, `purchase.receipt.post`.
- Trả NCC: `purchase.return.manage`.

## Cache và lỗi

- Mutation invalidate đúng list + detail family của chứng từ tương ứng.
- Lỗi dùng format chung `getApiErrorMessage`; không hiển thị request ID.
- 409 version stale/idempotency/maker-checker giữ drawer mở để người dùng tải lại hoặc sửa dữ liệu.

## Checklist khi sửa

- [ ] Không thêm status dropdown chung; lifecycle phải là named action.
- [ ] Không bỏ `expectedVersion` hoặc `Idempotency-Key`.
- [ ] Nếu DTO/operation đổi: sửa API, export OpenAPI, sync rồi generate; không sửa SDK tay.
- [ ] Kiểm tra quyền và state action ở cả policy test lẫn Backend.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.3.0 | 2026-10-10 | Tab đang mở, ô tìm, bộ lọc và trang nằm trên URL (chỉ mount tab đang chọn); khung danh sách/lệnh/lưu nháp dùng chung (`ProcurementListPanel`, `useProcurementListState`, `useDocumentCommand`, `useDocumentSave`); lookup tách theo loại và chỉ chạy khi form mở; trạng thái qua `StatusTag` + presentation map; huỷ chứng từ qua `useConfirmWithReason`. | REFACTOR-ADMIN-POLISH |
| 1.2.0 | 2026-09-30 | Ghi nhận mapping phiếu nhập theo PO và lookup search chưa hoàn tất pagination. | PROC-FE-01/02 |
| 1.1.0 | 2026-09-30 | Liên kết checklist hoàn thiện và ghi rõ chưa UAT trình duyệt. | PLAN-20260930-PROCUREMENT-UAT-RESTORE |
| 1.0.0 | 2026-09-30 | Tạo feature Procurement Admin từ 28 generated operation. | V2 Procurement Core |
