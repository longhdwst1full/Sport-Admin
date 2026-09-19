# Products — maintenance note

> **Document version:** 1.3.0
>
> **Last updated:** 2026-09-19
>
> **Change summary:** Danh sách mặc định 30 sản phẩm, cho chọn 10/20/30/50/100 và cuộn thân bảng theo viewport.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| CRUD sản phẩm, variant, bundle, giá, media; publish/archive | Brand/Category — thuộc `features/catalog-masters` |
| Policy publish và policy sắp xếp media (có test) | Tồn kho — thuộc `features/inventory` |

## Ranh giới

| Tầng | File |
| --- | --- |
| `pages/` | `products-page.tsx` — chỉ compose trang, toolbar, table và drawer |
| `hooks/` | `use-product-list.ts` sở hữu query/filter/pagination; `use-product-list-actions.tsx` sở hữu permission, mutation, confirm và cache invalidation |
| `components/` | `product-list-toolbar`, `product-list-table` và các drawer/panel nghiệp vụ |
| `constants/` | Hằng số page size của danh sách, không đặt trong page/hook/component |
| `model/` | `product-list.mapper.ts` tạo view model bất biến; policy/mapper nghiệp vụ khác đều có `.test.ts` |

Import từ ngoài chỉ qua `index.ts`.

## Generated operation

24 operation từ `src/generated/api/catalog`, gồm `useListAdminProducts`, `useGetAdminProduct`, `useCreateAdminProduct`, `useUpdateAdminProduct`, `usePublishAdminProduct`, `useArchiveAdminProduct`, `useReactivateAdminProduct`, nhóm variant (`create/update/archive/reactivate`), media (`attach/update/reorder/archive`), giá (`create/replace/timeline`) và bundle.

## Quyết định đã ghi

- Publish có điều kiện: `isProductPublishReady` kiểm tra đủ variant/giá/media trước khi mở nút. Backend vẫn kiểm tra lại.
- Media reorder tính ở `product-media.policy.ts` để việc kéo thả không phụ thuộc thứ tự trả về của API.
- Giá dùng Decimal dạng chuỗi; không parse sang `number` để tính toán (`09-data-transformation.md`).
- Không mang Redux/Saga và provider tree từ module tham khảo sang feature này. TanStack Query tiếp tục là nguồn server state duy nhất; local state chỉ giữ filter/pagination/UI selection.
- JSX bảng không đọc trực tiếp generated DTO; `toProductListRow` là biên chống contract lan vào presentation.

## Checklist khi sửa

- [ ] Sửa điều kiện publish phải cập nhật `product-workflow.policy.test.ts`.
- [ ] Mutation gửi `expectedVersion`; xung đột version hiển thị rõ, không im lặng ghi đè.
- [ ] Không đọc trực tiếp field DTO trong JSX — đi qua mapper.


## Operation generated nhưng không gọi (RULE-CTR-06)

| Operation | Lý do |
| --- | --- |
| `deleteAdminProduct` | Alias của `archiveAdminProduct` (`changeStatus → ARCHIVED`). Nút **Lưu trữ** ở workflow drawer đã dùng bản `archive`. |
| `deleteAdminProductVariant` | Alias của `archiveAdminProductVariant`. |
| `deleteAdminProductMedia` | Alias của `archiveAdminProductMedia`; nút **Gỡ** ở panel ảnh đã dùng bản `archive`. |

Sản phẩm đã bán không được xoá cứng — dòng đơn hàng còn tham chiếu tới biến thể. Lưu trữ là hành vi đúng.

**Điều kiện gỡ ghi chú:** BE tách `DELETE` thành xoá cứng cho sản phẩm chưa từng phát sinh giao dịch.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.3.0 | 2026-09-19 | Mặc định 30 sản phẩm/trang, thêm page-size selector và giữ table trong viewport. |
| 1.2.0 | 2026-09-19 | Tách ProductsPage thành page/hook/action/toolbar/table/constants/mapper và bổ sung Storybook cho bảng. |
| 1.1.0 | 2026-09-19 | Chuẩn hóa pagination và toolbar dưới bảng theo layout quản trị responsive. |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
