# Content — maintenance note

> **Document version:** 2.0.0
>
> **Last updated:** 2026-09-21
>
> **Change summary:** Gỡ cảnh báo in-memory: backend CMS đã lưu vào bảng `posts` qua Prisma. Ghi lại trạng thái vòng đời bài viết hiện có.

## Phạm vi

Tạo/liệt kê/xoá bài viết nội dung (`Admin Content`).

## Ranh giới

`pages/content-page.tsx` (list + filter) → `components/content-editor-drawer.tsx` (soạn thảo, nạp lazy).

## Generated operation

`useListAdminPosts`, `useCreateAdminPost`, `useUpdateAdminPost`, `useDeleteAdminPost` — `src/generated/api/content`.

## Dữ liệu đã bền

Bài viết lưu ở bảng `posts` qua Prisma (`api/src/modules/cms/cms.service.ts`). Cảnh báo "in-memory,
mất khi restart" của bản trước đã không còn đúng.

## Trạng thái bài viết

Bảng `posts` có sẵn `status`, `is_published`, `published_at`, `archived_at`, `archive_reason` —
nghĩa là schema đã đỡ được vòng đời Nháp → Xuất bản → Lưu trữ.

| Việc | Trạng thái |
| --- | --- |
| Lưu bền vào database | Có |
| Cờ `isPublished` tách khỏi `status` | Có — ẩn tạm một bài không cần đẩy về nháp |
| Chuyển trạng thái có tên (publish/archive) như Product | **Chưa** — hiện chỉ sửa trực tiếp |
| Tìm kiếm và phân trang phía server | **Chưa đầy đủ** |

Đừng mô tả màn này là đã có quy trình duyệt bài; nó mới là CRUD trên dữ liệu bền.

## Checklist khi sửa

- [ ] Ảnh bìa đi qua `features/media`, không nhập URL tự do.
- [ ] Xoá bài phải có xác nhận.
- [ ] Thêm chuyển trạng thái thì làm bằng use case có tên ở Backend, không patch thẳng cột `status`
      (rule `03-transitions-idempotency`).

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note, cảnh báo CMS in-memory. |
| 2.0.0 | 2026-09-21 | Gỡ cảnh báo in-memory; ghi lại vòng đời bài viết hiện có và phần còn thiếu. |
