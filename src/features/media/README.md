# Media — maintenance note

> **Document version:** 1.1.0
>
> **Last updated:** 2026-10-02
>
> **Change summary:** Thêm màn Thư viện ảnh `/media` (MED-02) và xoá ảnh khỏi Cloudinary (MED-03). Trước đó: Tạo note.

## Phạm vi

Một component dùng chung: `ImageUploadField` — chọn file, upload và trả về tham chiếu asset.

`ImageUploadField` được `features/products` và `features/content` dùng lại.

## Thư viện ảnh (`/media`)

- `pages/media-library-page.tsx`: danh sách `listAdminMediaAssets` (tìm, lọc trạng thái, "chỉ ảnh không còn dùng").
  Route và menu cần `media.asset.view`.
- `components/media-asset-drawer.tsx`: chi tiết `getAdminMediaAsset` và danh sách nơi đang dùng; xoá
  `deleteAdminMediaAsset` chỉ khi có `media.asset.manage`, ảnh ACTIVE và không còn nơi dùng, bắt buộc lý do.
- 409 `MEDIA_ASSET_IN_USE`: tải lại chi tiết để hiện nơi vừa gắn ảnh. API vẫn là nơi quyết định cuối.

## Ranh giới

`components/image-upload-field.tsx` gọi `src/lib/media/upload-image.ts`. Chính sách provider (Cloudinary) nằm ở `lib`, không nằm trong component.

## Checklist khi sửa

- [ ] Giữ ràng buộc content-type và dung lượng ở cả FE lẫn BE; FE chỉ là lớp tiện dụng.
- [ ] Không nhúng credential provider vào bundle client.
- [ ] Upload thất bại phải báo rõ, không im lặng bỏ qua.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.1.0 | 2026-10-02 | Thêm màn Thư viện ảnh `/media` (MED-02) và xoá ảnh khỏi Cloudinary (MED-03). |
| 1.0.0 | 2026-09-13 | Tạo note. |
