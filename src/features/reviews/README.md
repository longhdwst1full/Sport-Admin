# Reviews — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note; cảnh báo backend review lưu in-memory.

## Phạm vi

Hàng đợi kiểm duyệt đánh giá: liệt kê, duyệt/từ chối, xoá.

## Generated operation

`useListAdminReviews`, `useModerateAdminReview`, `useDeleteAdminReview` — `src/generated/api/reviews`.

## Ảnh hưởng ra Storefront

Chỉ đánh giá đã duyệt mới hiển thị trên trang sản phẩm (`05-commerce-content-media.md`). Từ chối hoặc xoá làm đánh giá biến mất ngoài cửa hàng.

## ⚠ Cảnh báo: dữ liệu chưa bền

`api/src/modules/review/review.service.ts` giữ dữ liệu trong **mảng in-memory**, chưa có model Prisma. Thao tác duyệt mất khi backend restart.

Ngoài ra Storefront **chưa gửi được đánh giá** — `review.controller.ts` mới chỉ có `@Get()` cho tag `Storefront Reviews`.

## Checklist khi sửa

- [ ] Duyệt/từ chối phải có lý do và ghi audit.
- [ ] Không hiển thị nội dung chưa duyệt ở bất kỳ đâu ngoài hàng đợi.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo review in-memory và thiếu POST phía Storefront. |
