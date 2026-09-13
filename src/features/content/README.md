# Content — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note; cảnh báo backend CMS hiện lưu in-memory.

## Phạm vi

Tạo/liệt kê/xoá bài viết nội dung (`Admin Content`).

## Ranh giới

`pages/content-page.tsx` (list + filter) → `components/content-editor-drawer.tsx` (soạn thảo, nạp lazy).

## Generated operation

`useListAdminPosts`, `useCreateAdminPost`, `useDeleteAdminPost` — `src/generated/api/content`.

## ⚠ Cảnh báo: dữ liệu chưa bền

`api/src/modules/cms/cms.service.ts` giữ bài viết trong **mảng in-memory**, chưa có model Prisma. Bài viết tạo qua màn hình này **mất khi backend restart** và không nằm trong database.

Không phải lỗi của FE. Chỉ khắc phục được khi backend thêm bảng `content_posts` + migration. Trước khi có, đừng quảng bá màn hình này là đã dùng được cho nội dung thật.

## Checklist khi sửa

- [ ] Không thêm tính năng phụ thuộc dữ liệu bền cho tới khi có model Prisma.
- [ ] Ảnh bìa đi qua `features/media`, không nhập URL tự do.
- [ ] Xoá bài phải có xác nhận.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo CMS in-memory. |
