# Reviews — maintenance note

> **Document version:** 4.0.0
>
> **Last updated:** 2026-09-29
>
> **Change summary:** Contract đổi lại: đánh giá của khách đã mua vào thẳng `APPROVED` và hiển thị ngay; `PENDING` chỉ còn ở dữ liệu cũ. Admin action đổi ý nghĩa từ "duyệt lần đầu" sang hậu kiểm ẩn/khôi phục.

## Phạm vi

Quản lý hàng đợi đánh giá: liệt kê, hậu kiểm ẩn (`REJECTED`)/khôi phục (`APPROVED`) và phản hồi khách hàng. Đánh giá mới của khách đã mua vào thẳng `APPROVED`; `PENDING` không còn được backend gán mới, chỉ còn xuất hiện ở dữ liệu cũ trước khi đổi hành vi.

## Generated operation

`useListAdminReviews`, `useModerateAdminReview`, `useReplyAdminReview`, `useDeleteAdminReview` — `src/generated/api/reviews`.

Quyền tương ứng là `catalog.review.moderate` và `catalog.review.reply`. UI gate chỉ điều khiển affordance; backend luôn kiểm tra quyền và version.
Backend còn lọc theo branch của order item: quản lý chi nhánh không nhìn thấy hoặc thao tác review của chi nhánh khác.

## Ảnh hưởng ra Storefront

Trang sản phẩm chỉ đọc `APPROVED`. `PENDING` (dữ liệu cũ) và `REJECTED` (đã ẩn) không xuất hiện công khai. Phản hồi STAFF của đánh giá đang `APPROVED` được hiển thị cùng đánh giá.

## Checklist khi sửa

- [ ] Ẩn/khôi phục phải gửi `expectedVersion`; xung đột không được ghi đè.
- [ ] Chỉ cho phản hồi đánh giá `APPROVED`; sau mutation phải cập nhật detail và invalidate list.
- [ ] Không sửa contract hoặc generated code thủ công; thay producer OpenAPI rồi regenerate.
- [ ] Ảnh đánh giá chỉ hiển thị từ DTO `media`, không dựng URL ở Admin.
- [ ] Copy/label UI không được ngụ ý "chờ duyệt trước khi hiển thị" — đánh giá đã hiển thị ngay, action chỉ là hậu kiểm.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 4.0.0 | 2026-09-29 | Contract đổi lại đăng ngay (`APPROVED` mặc định); cập nhật label/metric/action UI từ "duyệt" sang "ẩn/khôi phục". |
| 3.0.0 | 2026-09-28 | Thêm quy trình tiền kiểm, ảnh đánh giá và phản hồi Admin có optimistic concurrency. |
| 2.0.0 | 2026-09-17 | Đánh giá hiển thị ngay khi gửi; Admin chỉ ẩn/hiện lại. Gỡ cảnh báo in-memory vì review đã persist qua Prisma. |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo review in-memory và thiếu POST phía Storefront. |
