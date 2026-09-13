# Media — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note.

## Phạm vi

Một component dùng chung: `ImageUploadField` — chọn file, upload và trả về tham chiếu asset.

Feature không có trang riêng; được `features/products` và `features/content` dùng lại.

## Ranh giới

`components/image-upload-field.tsx` gọi `src/lib/media/upload-image.ts`. Chính sách provider (Cloudinary) nằm ở `lib`, không nằm trong component.

## Checklist khi sửa

- [ ] Giữ ràng buộc content-type và dung lượng ở cả FE lẫn BE; FE chỉ là lớp tiện dụng.
- [ ] Không nhúng credential provider vào bundle client.
- [ ] Upload thất bại phải báo rõ, không im lặng bỏ qua.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note. |
