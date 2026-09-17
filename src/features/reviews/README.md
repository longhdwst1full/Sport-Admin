# Reviews — maintenance note

> **Document version:** 2.0.0
>
> **Last updated:** 2026-09-17
>
> **Change summary:** Bỏ bước chờ duyệt; đánh giá hiển thị ngay và kiểm duyệt chuyển thành hậu kiểm.

## Phạm vi

Hậu kiểm đánh giá: liệt kê, ẩn/hiện lại, xoá. Đánh giá hiển thị ngay khi khách gửi, không qua hàng đợi duyệt.

## Generated operation

`useListAdminReviews`, `useModerateAdminReview`, `useDeleteAdminReview` — `src/generated/api/reviews`.

## Ảnh hưởng ra Storefront

Trang sản phẩm hiện mọi đánh giá trừ đánh giá đã bị gỡ (`REJECTED`). Ẩn hoặc xoá làm đánh giá biến mất ngoài cửa hàng; hiện lại đưa nó trở về.

## ⚠ Còn thiếu

Storefront **chưa gửi được đánh giá** — `review.controller.ts` mới chỉ có `@Get()` cho tag `Storefront Reviews`. Khi làm endpoint gửi, đánh giá vào thẳng `APPROVED` theo mặc định của cột.

## Checklist khi sửa

- [ ] Ẩn đánh giá phải có lý do và ghi lại thời điểm kiểm duyệt.
- [ ] Không thêm lại bước chờ duyệt: đánh giá mới phải hiển thị ngay.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 2.0.0 | 2026-09-17 | Đánh giá hiển thị ngay khi gửi; Admin chỉ ẩn/hiện lại. Gỡ cảnh báo in-memory vì review đã persist qua Prisma. |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo review in-memory và thiếu POST phía Storefront. |
