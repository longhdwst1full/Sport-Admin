# Products — maintenance note

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-19
>
> **Change summary:** Chuẩn hóa list sản phẩm: mặc định 20 dòng, chọn 20/50/100, pagination responsive và refresh icon dưới bảng.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| CRUD sản phẩm, variant, bundle, giá, media; publish/archive | Brand/Category — thuộc `features/catalog-masters` |
| Policy publish và policy sắp xếp media (có test) | Tồn kho — thuộc `features/inventory` |

## Ranh giới

| Tầng | File |
| --- | --- |
| `pages/` | `products-page.tsx` — list, filter, chọn bản ghi |
| `components/` | `product-form-drawer`, `product-workflow-drawer`, `product-media-panel`, `product-price-panel`, `variant-edit-drawer` |
| `model/` | `product-workflow.policy.ts` (điều kiện publish), `product-media.policy.ts` (reorder), `variant-edit.mapper.ts` — đều có `.test.ts` |

Import từ ngoài chỉ qua `index.ts`.

## Generated operation

24 operation từ `src/generated/api/catalog`, gồm `useListAdminProducts`, `useGetAdminProduct`, `useCreateAdminProduct`, `useUpdateAdminProduct`, `usePublishAdminProduct`, `useArchiveAdminProduct`, `useReactivateAdminProduct`, nhóm variant (`create/update/archive/reactivate`), media (`attach/update/reorder/archive`), giá (`create/replace/timeline`) và bundle.

## Quyết định đã ghi

- Publish có điều kiện: `isProductPublishReady` kiểm tra đủ variant/giá/media trước khi mở nút. Backend vẫn kiểm tra lại.
- Media reorder tính ở `product-media.policy.ts` để việc kéo thả không phụ thuộc thứ tự trả về của API.
- Giá dùng Decimal dạng chuỗi; không parse sang `number` để tính toán (`09-data-transformation.md`).

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
| 1.1.0 | 2026-09-19 | Chuẩn hóa pagination và toolbar dưới bảng theo layout quản trị responsive. |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
