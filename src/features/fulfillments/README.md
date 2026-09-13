# Fulfillments — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo trang hàng đợi giao vận; trước đó `listAdminFulfillments` đã generate nhưng không màn hình nào gọi.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Hàng đợi giao vận toàn kho: lọc trạng thái, tìm kiếm, phân trang | **Chuyển trạng thái** — nằm ở `features/orders/components/fulfillment-workflow-panel.tsx` |
| Mở nhanh đơn tương ứng để xử lý | Điều chỉnh tồn kho — thuộc `features/inventory` |

## Lý do tồn tại

Trước đây nhân viên kho phải biết trước mã đơn rồi vào `Đơn hàng` mới thấy phiếu giao vận. Không có chỗ nào trả lời "hôm nay còn bao nhiêu đơn chờ lấy hàng".

Trang này **chỉ đọc**: mọi hành động vẫn đi qua `OrderDetailDrawer` để không nhân đôi logic chuyển trạng thái (expected version, idempotency key, kiểm tra payment).

## Ranh giới

`pages/fulfillments-page.tsx` (filter/paging) → `components/fulfillment-table.tsx` (trình bày) → `OrderDetailDrawer` nhập từ barrel `@/features/orders`.

## Generated operation

| Dùng | Nguồn |
| --- | --- |
| `useListAdminFulfillments` | `src/generated/api/fulfillments/fulfillments.ts` |

Tìm kiếm chạy server-side trên 6 field: `fulfillmentNo`, `trackingNo`, `orderNo`, tên / SĐT / **email** người nhận.

## Quyền

Route gác bằng `fulfillment.view` (scope `GLOBAL;BRANCH;WAREHOUSE;OWN`). Backend vẫn lọc theo branch scope của principal — FE không tự lọc.

## Checklist khi sửa

- [ ] Không thêm nút chuyển trạng thái trực tiếp ở bảng; hành động thuộc workflow panel.
- [ ] Nhãn trạng thái map tách khỏi mã trong `constants/`; đổi chữ không được đổi so sánh.
- [ ] Thêm trạng thái mới phải cập nhật `fulfillmentStatusPresentation`, nếu không bảng hiện mã thô.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo feature, lấp khoảng trống `listAdminFulfillments` chưa được dùng. |
