# Flash Sales — maintenance note

> **Document version:** 1.1.0
>
> **Last updated:** 2026-11-07
>
> **Change summary:** Thêm nhập số suất chung và áp dụng cho tất cả SKU trong form tạo/sửa, đồng thời làm mặc định cho SKU thêm mới; chặn quota thấp hơn số đã bán/giữ.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Tạo chiến dịch, chuyển vòng đời, thêm/sửa/gỡ suất bán | Giá thường của SKU — thuộc `features/products` |
| Xem quota, đã bán, còn lại | Tồn kho vật lý — thuộc `features/inventory` |

## Ranh giới

`pages/flash-sales-page.tsx` (list/filter/tạo mới) → `components/flash-sale-table.tsx` (bảng) → `components/flash-sale-detail-drawer.tsx` (chi tiết, vòng đời, gỡ suất). Tạo và sửa dùng chung `components/flash-sale-form-drawer.tsx` (thông tin chiến dịch + `flash-sale-items-editor.tsx`: chọn nhiều SKU một lượt, sửa giá/suất trên dòng, một nút lưu tất cả) → `hooks/use-save-flash-sale.ts` (sửa/tạo chiến dịch rồi upsert tuần tự các suất mới/đã đổi; API không có lệnh lưu gộp). Mapping ở `model/flash-sale.mapper.ts` (+ test).

## Generated operation

`useListAdminFlashSales`, `useGetAdminFlashSale`, `createAdminFlashSale`, `changeAdminFlashSaleStatus`, `upsertAdminFlashSaleItem`, `removeAdminFlashSaleItem` — `src/generated/api/promotions`.

## Bất biến cần nhớ khi sửa

1. **Quota flash không phải tồn kho.** Đặt quota 100 không có nghĩa kho có 100 cái. Checkout phải giành được cả hai.
2. **State machine** `DRAFT → SCHEDULED → ACTIVE → ENDED`; `ENDED`/`CANCELLED` là terminal. Bản sao ở `constants/` chỉ để hiện đúng nút — backend vẫn quyết định.
3. **Không hạ quota xuống dưới `sold + reserved`** — backend trả 409, FE không được bỏ qua lỗi này.
4. **Gỡ suất đã phát sinh giao dịch** chỉ chuyển `INACTIVE`, không xóa. Popconfirm đã nói rõ điều đó.
5. **Giá gửi dạng chuỗi Decimal** (`toFixed(2)`), không gửi number.
6. **Điền số suất hàng loạt là quota tổng cho từng SKU**, không phải tổng cả chiến dịch hay giới hạn từng khách. Ví dụ 10 SKU, nhập 5 → mỗi SKU tối đa 5 suất (tổng 50). Nút Áp dụng cập nhật toàn bộ dòng đang soạn; SKU thêm sau nhận giá trị chung hợp lệ. Không tự cộng số đã bán, không tự nâng từng dòng lên minimum. Nếu có dòng đã bán/giữ vượt giá trị nhập thì chặn áp dụng cả lô và báo minimum; backend vẫn kiểm tra cạnh tranh khi Lưu. Không gọi API khi chỉ nhập/áp dụng; vẫn sửa được từng dòng trước khi lưu. Policy và regression test ở `model/flash-sale-quota.ts` / `.test.ts`.

## Quyền

`catalog.flash_sale.view` để xem, `catalog.flash_sale.manage` để thao tác. `useCan` chỉ ẩn/hiện nút; backend kiểm tra lại.

## Checklist khi sửa

- [ ] Mutation gửi `expectedVersion`; xung đột phải hiện rõ, không ghi đè im lặng.
- [ ] Thêm trạng thái mới phải cập nhật cả `flashSaleStatusPresentation` và `FLASH_SALE_TRANSITIONS`.
- [ ] Không cho đặt giá flash cao hơn giá thường mà không cảnh báo.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.1.0 | 2026-11-07 | Điền quota cho tất cả SKU, áp mặc định SKU thêm mới, kiểm minimum đã bán/giữ và giữ nguyên cơ chế lưu/API. |
| 1.0.0 | 2026-09-13 | Tạo feature quản lý flash sale. |
