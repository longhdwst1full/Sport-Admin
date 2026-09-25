# Catalog masters — maintenance note

> **Document version:** 2.1.0
>
> **Last updated:** 2026-09-25
>
> **Change summary:** Thêm màn Thuộc tính sản phẩm (`/attributes`) cho thông số kỹ thuật theo decision D61.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| CRUD + activate/deactivate Brand và Category | Sản phẩm — thuộc `features/products` |

## Ranh giới

Hai màn độc lập, mỗi màn một mục menu và một `PermissionRoute` riêng:

| Màn | Route | Quyền vào màn |
| --- | --- | --- |
| `pages/brands-page.tsx` | `/brands` | `catalog.brand.view` |
| `pages/categories-page.tsx` | `/categories` | `catalog.category.view` |

`/catalog-masters` (màn ghép cũ) redirect về `/brands`.

Dùng chung: `components/master-data-form-drawers.tsx` (form Brand/Category), `components/master-columns.tsx` (cột Mã + Trạng thái, `MASTER_STATUSES`), `model/catalog-masters.mapper.ts` (lọc tìm kiếm, có test).

Trước đây một màn gộp hai tab gác bằng `catalog.brand.view`, nên người chỉ có quyền danh mục không vào được. Tách ra để quyền vào màn khớp đúng dữ liệu màn đó quản.

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

## Thuộc tính sản phẩm (`/attributes`)

- `pages/attributes-page.tsx`, `components/attribute-form-drawer.tsx`, `model/attribute-form.ts`.
- Mã và kiểu chỉ nhập khi tạo (API không cho đổi). Không có nút xoá — chỉ Ngừng/Dùng lại, vì thông số
  sản phẩm tham chiếu theo mã. Đổi đơn vị (NUMBER) hay bỏ lựa chọn đang được dùng → API trả 409.
- Quyền theo `catalog.product.view/manage`. Nhập thông số cho từng sản phẩm ở drawer sản phẩm
  (`features/products/components/product-specifications-panel.tsx`).

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
| 2.1.0 | 2026-09-25 | Thêm màn Thuộc tính sản phẩm (D61). |
| 2.0.0 | 2026-09-21 | Tách hai màn Thương hiệu / Danh mục, thêm redirect đường dẫn cũ. |
| 1.0.0 | 2026-09-13 | Tạo note; ghi rõ ảnh hưởng Category ra Storefront. |
