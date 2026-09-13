# Flash Sales — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo màn hình quản lý chiến dịch flash sale (wave S6.4).

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Tạo chiến dịch, chuyển vòng đời, thêm/sửa/gỡ suất bán | Giá thường của SKU — thuộc `features/products` |
| Xem quota, đã bán, còn lại | Tồn kho vật lý — thuộc `features/inventory` |

## Ranh giới

`pages/flash-sales-page.tsx` (list/filter/tạo mới) → `components/flash-sale-table.tsx` (bảng) → `components/flash-sale-detail-drawer.tsx` (chi tiết, vòng đời, quản lý suất bán).

## Generated operation

`useListAdminFlashSales`, `useGetAdminFlashSale`, `createAdminFlashSale`, `changeAdminFlashSaleStatus`, `upsertAdminFlashSaleItem`, `removeAdminFlashSaleItem` — `src/generated/api/promotions`.

## Bất biến cần nhớ khi sửa

1. **Quota flash không phải tồn kho.** Đặt quota 100 không có nghĩa kho có 100 cái. Checkout phải giành được cả hai.
2. **State machine** `DRAFT → SCHEDULED → ACTIVE → ENDED`; `ENDED`/`CANCELLED` là terminal. Bản sao ở `constants/` chỉ để hiện đúng nút — backend vẫn quyết định.
3. **Không hạ quota xuống dưới `sold + reserved`** — backend trả 409, FE không được bỏ qua lỗi này.
4. **Gỡ suất đã phát sinh giao dịch** chỉ chuyển `INACTIVE`, không xóa. Popconfirm đã nói rõ điều đó.
5. **Giá gửi dạng chuỗi Decimal** (`toFixed(2)`), không gửi number.

## Quyền

`catalog.flash_sale.view` để xem, `catalog.flash_sale.manage` để thao tác. `useCan` chỉ ẩn/hiện nút; backend kiểm tra lại.

## Checklist khi sửa

- [ ] Mutation gửi `expectedVersion`; xung đột phải hiện rõ, không ghi đè im lặng.
- [ ] Thêm trạng thái mới phải cập nhật cả `flashSaleStatusPresentation` và `FLASH_SALE_TRANSITIONS`.
- [ ] Không cho đặt giá flash cao hơn giá thường mà không cảnh báo.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo feature quản lý flash sale. |
