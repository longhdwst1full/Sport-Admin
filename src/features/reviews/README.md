# Reviews — maintenance note

> **Document version:** 3.0.0
>
> **Last updated:** 2026-09-28
>
> **Change summary:** Khôi phục tiền kiểm `PENDING → APPROVED/REJECTED`, bổ sung phản hồi Admin và ảnh đánh giá.

## Phạm vi

Quản lý hàng đợi đánh giá: liệt kê, duyệt/từ chối, ẩn logic và phản hồi khách hàng. Đánh giá mới luôn ở `PENDING`; chỉ `APPROVED` được hiển thị trên Storefront.

## Generated operation

`useListAdminReviews`, `useModerateAdminReview`, `useReplyAdminReview`, `useDeleteAdminReview` — `src/generated/api/reviews`.

Quyền tương ứng là `catalog.review.moderate` và `catalog.review.reply`. UI gate chỉ điều khiển affordance; backend luôn kiểm tra quyền và version.
Backend còn lọc theo branch của order item: quản lý chi nhánh không nhìn thấy hoặc thao tác review của chi nhánh khác.

## Ảnh hưởng ra Storefront

Trang sản phẩm chỉ đọc `APPROVED`. `PENDING` và `REJECTED` không xuất hiện công khai. Phản hồi STAFF của đánh giá đã duyệt được hiển thị cùng đánh giá.

## Checklist khi sửa

- [ ] Duyệt/từ chối/ẩn phải gửi `expectedVersion`; xung đột không được ghi đè.
- [ ] Chỉ cho phản hồi đánh giá `APPROVED`; sau mutation phải cập nhật detail và invalidate list.
- [ ] Không sửa contract hoặc generated code thủ công; thay producer OpenAPI rồi regenerate.
- [ ] Ảnh đánh giá chỉ hiển thị từ DTO `media`, không dựng URL ở Admin.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 3.0.0 | 2026-09-28 | Thêm quy trình tiền kiểm, ảnh đánh giá và phản hồi Admin có optimistic concurrency. |
| 2.0.0 | 2026-09-17 | Đánh giá hiển thị ngay khi gửi; Admin chỉ ẩn/hiện lại. Gỡ cảnh báo in-memory vì review đã persist qua Prisma. |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo review in-memory và thiếu POST phía Storefront. |
