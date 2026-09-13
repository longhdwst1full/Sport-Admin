# Payment management

> **Version:** 1.1.0  
> **Updated:** 2026-09-12  
> **Summary:** Harden idempotency theo payload và invalidate Payment/Order caches sau review.

## Scope

- Route `/payments`, menu `Thanh toán`; server state thuộc TanStack Query.
- Dùng generated operations `listAdminPayments`, `getAdminPayment`, `confirmAdminPayment`, `rejectAdminPayment`.
- Permission hiển thị là `payment.view`; thao tác duyệt cần `payment.confirm`. Backend vẫn là nguồn kiểm tra quyền và branch scope.
- Chuyển khoản chỉ được xác nhận khi có bằng chứng chờ duyệt. COD chỉ được ghi nhận sau khi Order ở `DELIVERED`.
- Mutation gửi `expectedVersion` và `Idempotency-Key`; key chỉ được giữ khi retry đúng cùng payload, còn payload đổi sẽ sinh key mới.
- Sau mutation, Payment detail được cập nhật từ response; Payment list, Order detail và mọi trang Order list đều bị invalidate vì summary status đã thay đổi.

## UI states and maintenance

- Page/table/drawer có loading, empty, error và disabled-action state; `PermissionRoute` xử lý forbidden ở route.
- `PaymentTable` là presentation component và có Storybook cho dữ liệu nhiều trạng thái.
- Khi contract/state thay đổi: sửa API producer, export OpenAPI, sync contract, regenerate SDK rồi cập nhật mapping/constants tại feature này. Không sửa `src/generated/api` thủ công.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.1.0 | 2026-09-12 | Đồng bộ cache Order sau review Payment và khóa idempotency theo payload signature. |
| 1.0.0 | 2026-09-12 | Tạo feature note cho Payment Admin V1. |
