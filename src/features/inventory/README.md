# Inventory — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note sau khi tách 9 file phẳng thành `pages/components`.

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

## Checklist khi sửa

- [ ] Mọi mutation gửi `expectedVersion` + `Idempotency-Key`; retry không được tạo phiếu trùng.
- [ ] Không tự tính tồn khả dụng ở FE.
- [ ] Giữ warehouse scope: người dùng chỉ thấy kho thuộc quyền.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note sau khi chuẩn hoá anatomy. |
