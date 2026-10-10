# Inventory — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-10-10
>
> **Change summary:** Tab và bộ lọc tồn kho lên URL; drawer chi tiết dùng `DetailDrawer`; huỷ phiếu qua `useConfirmWithReason`.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Tồn kho, movement, điều chỉnh kho, chuyển kho | Giảm tồn khi ship — thuộc Fulfillment (`features/orders`) |
| Ship/receive của phiếu chuyển kho | Đặt giữ hàng khi checkout — thuộc backend reservation |

## Ranh giới

| Tầng | File |
| --- | --- |
| `pages/` | `inventory-page.tsx` (+ `.stories.tsx`) — tab và điều phối |
| `components/` | `inventory-balance-panel`, `inventory-movement-panel`, `stock-adjustment-panel`, `stock-adjustment-drawer`, `stock-transfer-panel`, `stock-transfer-create-drawer`, `stock-transfer-detail-drawer`, `stock-adjustment-detail-drawer`, `inventory-document-filters` (hàng lọc chung phiếu chuyển kho/kiểm kê), stocktake drawers |
| `hooks/` | `use-warehouse-options` (options kho đang hoạt động, tìm phía server), `use-inventory-document-filters` (lọc + trang của danh sách phiếu), `use-cursor-pages` (phân trang cursor có nút lùi), `use-variant-options` (options SKU đang bán, tìm phía server), `use-tab-url-filters` (lọc + trang của một tab trên URL) |
| `constants/` | `inventory.constants` (nhãn trạng thái tồn, loại biến động, loại/lý do điều chỉnh, cột tuỳ chỉnh), `stock-transfer.constants`, `stocktake.constants` |

## Generated operation

`useListInventoryBalances`, `useListInventoryMovements`, `useListStockAdjustments`, `useGetStockAdjustment`, `useCreateStockAdjustment`, `useListStockTransfers`, `useGetStockTransfer`, `useCreateStockTransfer`, `useSubmitStockTransfer`, `useShipStockTransfer`, `useReceiveStockTransfer`, `useUpdateStockTransfer`, `useCancelStockTransfer`, `useSearchActiveAdminWarehouses`, `useSearchActiveAdminProductVariants`.

## Bất biến nghiệp vụ

- Movement là append-only: không sửa, không xoá. Sai sót được sửa bằng bút toán điều chỉnh mới.
- Chuyển kho theo trạng thái `DRAFT → SUBMITTED → SHIPPED → RECEIVED`; không nhảy bước ở FE.
- Sửa lý do/danh sách SKU chỉ khi `DRAFT` (kho xuất/nhận cố định); huỷ khi `DRAFT`/`SUBMITTED` kèm lý do, sau `SHIPPED` thì không huỷ. Nút hiển thị theo `model/stock-transfer-actions.policy.ts`; API vẫn kiểm quyền, branch scope và version.
- `reserved` không bao giờ vượt `on_hand`; con số hiển thị lấy nguyên từ API, không tự tính lại.

## URL

Tab đang mở ở `tab`. Mỗi tab giữ bộ lọc trên URL với tiền tố riêng vì mọi tab cùng mount:
`balance.q|warehouse|page`, `movement.q|warehouse|type` (cursor không lên URL), `transfer.q|warehouse|status|page`,
`stocktake.q|warehouse|status|page`. Đổi bộ lọc thì xoá trang của tab đó.

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
| 1.2.0 | 2026-10-10 | URL filters theo tab, DetailDrawer, StatusTone, huỷ phiếu qua hộp lý do. |
| 1.1.0 | 2026-09-25 | Nhập tồn đầu hàng loạt từ CSV. |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
