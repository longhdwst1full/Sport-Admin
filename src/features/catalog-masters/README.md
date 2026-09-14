# Catalog masters — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note; Category giờ là nguồn dữ liệu thật của trang danh mục Storefront.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| CRUD + activate/deactivate Brand và Category | Sản phẩm — thuộc `features/products` |

## Ranh giới

`pages/catalog-masters-page.tsx` (tab Brand/Category) → `components/master-data-form-drawers.tsx` (form) → `model/catalog-masters.mapper.ts` (form ↔ DTO, có test).

## Generated operation

`useListAdminBrands`, `useCreateAdminBrand`, `useUpdateAdminBrand`, `useActivateAdminBrand`, `useDeactivateAdminBrand` và bộ tương ứng cho Category — `src/generated/api/catalog`.

## Ảnh hưởng ra Storefront — đọc trước khi sửa

Category sửa ở đây **hiển thị trực tiếp** trên `/category` và rail danh mục trang chủ của Storefront qua `GET /api/v1/catalog/categories`.

| Field | Ảnh hưởng |
| --- | --- |
| `status` | Chỉ `ACTIVE` mới xuất hiện ngoài cửa hàng |
| `slug` | Là URL công khai `/category/<slug>`; đổi slug làm hỏng link cũ và SEO |
| `name`, `description` | Hiển thị nguyên văn trên card danh mục |
| `imageAssetId` | Ảnh card; thiếu ảnh thì Storefront render placeholder |
| `sortOrder` | Thứ tự hiển thị |

Storefront cache ISR 5 phút, nên thay đổi không xuất hiện tức thì.

## Checklist khi sửa

- [ ] Đổi `slug` phải cân nhắc redirect; đây là URL công khai.
- [ ] Deactivate category làm nó biến mất khỏi Storefront — xác nhận trước khi làm.
- [ ] Đổi field form phải cập nhật mapper + test.


## Operation generated nhưng không gọi (RULE-CTR-06)

| Operation | Lý do |
| --- | --- |
| `deleteAdminBrand` | Alias của `deactivateAdminBrand` — cùng gọi `changeBrandStatus(id, 'INACTIVE')` ở `api/src/modules/catalog/master-data/catalog-master.controller.ts`. Nút **Ngừng** đã dùng bản `deactivate`. Thêm nút thứ hai chỉ tạo hai lối vào cho cùng một hành vi. |
| `deleteAdminCategory` | Như trên, alias của `deactivateAdminCategory`. |

**Điều kiện gỡ ghi chú:** nếu BE tách `DELETE` thành xoá cứng thật (khác `changeStatus`), phải nối lại và phân biệt rõ hai hành vi trên giao diện.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note; ghi rõ ảnh hưởng Category ra Storefront. |
