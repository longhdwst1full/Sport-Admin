# Inventory — maintenance note

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-25
>
> **Change summary:** Thêm nhập tồn đầu hàng loạt từ CSV (phiếu OPENING_BALANCE theo lô, idempotent).

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Tồn kho, movement, điều chỉnh kho, chuyển kho | Giảm tồn khi ship — thuộc Fulfillment (`features/orders`) |
| Ship/receive của phiếu chuyển kho | Đặt giữ hàng khi checkout — thuộc backend reservation |

## Ranh giới

| Tầng | File |
| --- | --- |
| `pages/` | `inventory-page.tsx` (+ `.stories.tsx`) — tab và điều phối |
| `components/` | `inventory-balance-panel`, `inventory-movement-panel`, `stock-adjustment-panel`, `stock-adjustment-drawer`, `stock-transfer-panel`, `stock-transfer-create-drawer`, `stock-transfer-detail-drawer` |

## Generated operation

`useListInventoryBalances`, `useListInventoryMovements`, `useListStockAdjustments`, `useGetStockAdjustment`, `useCreateStockAdjustment`, `useListStockTransfers`, `useGetStockTransfer`, `useCreateStockTransfer`, `useSubmitStockTransfer`, `useShipStockTransfer`, `useReceiveStockTransfer`, `useSearchActiveAdminWarehouses`, `useSearchActiveAdminProductVariants`.

## Bất biến nghiệp vụ

- Movement là append-only: không sửa, không xoá. Sai sót được sửa bằng bút toán điều chỉnh mới.
- Chuyển kho theo trạng thái `DRAFT → SUBMITTED → SHIPPED → RECEIVED`; không nhảy bước ở FE.
- `reserved` không bao giờ vượt `on_hand`; con số hiển thị lấy nguyên từ API, không tự tính lại.

## Nhập tồn đầu từ file

- `components/opening-stock-import-drawer.tsx` + `model/opening-stock-import.ts`: CSV `sku,so_luong`
  (phẩy hoặc chấm phẩy, BOM, tiêu đề tuỳ chọn). Trùng SKU/số lượng không phải số nguyên dương là lỗi
  dòng, không tự cộng. Chỉ CSV để không thêm thư viện đọc XLSX.
- Ghi bằng `createStockAdjustment` (OPENING_BALANCE, INITIAL_STOCK) theo lô 100 dòng; mỗi lô có
  `Idempotency-Key` `<batchId>-<lô>` nên "Tiếp tục ghi" sau lỗi mạng không ghi trùng lô đã xong.
- API chỉ nhận OPENING_BALANCE khi SKU chưa có biến động tại kho và cả lô là all-or-nothing.
- "Tải file mẫu" lấy toàn bộ SKU đang bán (`searchActiveAdminProductVariants`, 50/trang).

## Checklist khi sửa

- [ ] Mọi mutation gửi `expectedVersion` + `Idempotency-Key`; retry không được tạo phiếu trùng.
- [ ] Không tự tính tồn khả dụng ở FE.
- [ ] Giữ warehouse scope: người dùng chỉ thấy kho thuộc quyền.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.1.0 | 2026-09-25 | Nhập tồn đầu hàng loạt từ CSV. |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
