# Payment management

> **Version:** 1.2.0  
> **Updated:** 2026-10-10  
> **Summary:** Lọc/trang trên URL, drawer chuẩn `DetailDrawer`, từ chối bằng chứng qua `useConfirmWithReason`.

## Scope

- Route `/payments`, menu `Thanh toán`; server state thuộc TanStack Query.
- Dùng generated operations `listAdminPayments`, `getAdminPayment`, `confirmAdminPayment`, `rejectAdminPayment`.
- Permission hiển thị là `payment.view`; thao tác duyệt cần `payment.confirm`. Backend vẫn là nguồn kiểm tra quyền và branch scope.
- Chuyển khoản chỉ được xác nhận khi có bằng chứng chờ duyệt. COD chỉ được ghi nhận sau khi Order ở `DELIVERED`.
- Mutation gửi `expectedVersion` và `Idempotency-Key`; key chỉ được giữ khi retry đúng cùng payload, còn payload đổi sẽ sinh key mới.
- Sau mutation, Payment detail được cập nhật từ response; Payment list, Order detail và mọi trang Order list đều bị invalidate vì summary status đã thay đổi.

## UI states and maintenance

- `search`, `status`, `method`, `page` nằm trên URL; đổi bộ lọc xoá `page`.
- Page/table/drawer có loading (skeleton), empty, error (có "Thử lại") và disabled-action state; `PermissionRoute` xử lý forbidden ở route.
- Xác nhận đủ tiền dùng `FormModal` (hỏi lại khi đóng lúc đã nhập); từ chối bằng chứng dùng `useConfirmWithReason` (lý do ≥ 3 ký tự).
- `paymentOrderStatusLabels` là nhãn trạng thái đơn riêng của payments vì `orders` đã phụ thuộc `payments` (không import ngược); khoá theo `OrderStatus` generated.
- `PaymentTable` là presentation component và có Storybook cho dữ liệu nhiều trạng thái.
- Khi contract/state thay đổi: sửa API producer, export OpenAPI, sync contract, regenerate SDK rồi cập nhật mapping/constants tại feature này. Không sửa `src/generated/api` thủ công.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.2.0 | 2026-10-10 | URL filters, `StatusTag`/tone cho thanh toán và bằng chứng, `DetailDrawer`, `FormModal`, `useConfirmWithReason`. |
| 1.1.0 | 2026-09-12 | Đồng bộ cache Order sau review Payment và khóa idempotency theo payload signature. |
| 1.0.0 | 2026-09-12 | Tạo feature note cho Payment Admin V1. |
