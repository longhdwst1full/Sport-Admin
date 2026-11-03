# Fulfillments — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-11-03
>
> **Change summary:** GHN tự động: bàn giao không nhập mã vận đơn; disable đổi tay kết quả khi SHIPPED/GHN, đọc trạng thái nội bộ mỗi 15s khi tab hoạt động. Field shippingMethod/shippingProvider đến từ OpenAPI regenerate. Giao ngoài giữ nhập mã/tác vụ thủ công.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Hàng đợi giao vận toàn kho: lọc trạng thái, tìm kiếm, phân trang | **Chuyển trạng thái** — nằm ở `features/orders/components/fulfillment-workflow-panel.tsx` |
| Mở nhanh đơn tương ứng để xử lý | Điều chỉnh tồn kho — thuộc `features/inventory` |

## Lý do tồn tại

Trước đây nhân viên kho phải biết trước mã đơn rồi vào `Đơn hàng` mới thấy phiếu giao vận. Không có chỗ nào trả lời "hôm nay còn bao nhiêu đơn chờ lấy hàng".

Trang này **chỉ đọc**: mọi hành động vẫn đi qua `OrderDetailDrawer` để không nhân đôi logic chuyển trạng thái (expected version, idempotency key, kiểm tra payment).

## Ranh giới

`pages/fulfillments-page.tsx` (filter/paging; `search`, `status`, `page` nằm trên URL) → `components/fulfillment-table.tsx` (trình bày) → `OrderDetailDrawer` từ barrel `@/features/orders`.

Chiều phụ thuộc tĩnh chỉ là `fulfillments → orders`. `OrderDetailDrawer` không import gì từ `fulfillments`: nơi gọi inject `renderFulfillmentPanel` (panel giao vận) và `renderShipmentStatus` (`FulfillmentStatusTag`). `orders-page` nạp hai component này bằng `lazy()` qua barrel `@/features/fulfillments` để không khép vòng chunk.

## Generated operation

| Dùng | Nguồn |
| --- | --- |
| `useListAdminFulfillments` | `src/generated/api/fulfillments/fulfillments.ts` |

Tìm kiếm chạy server-side trên 6 field: `fulfillmentNo`, `trackingNo`, `orderNo`, tên / SĐT / **email** người nhận.

## Quyền

Route gác bằng `fulfillment.view` (scope `GLOBAL;BRANCH;WAREHOUSE;OWN`). Backend vẫn lọc theo branch scope của principal — FE không tự lọc.

## Checklist khi sửa

- [ ] Không thêm nút chuyển trạng thái trực tiếp ở bảng; hành động thuộc workflow panel.
- [ ] Nhãn trạng thái map tách khỏi mã trong `constants/`; đổi chữ không được đổi so sánh.
- [ ] Thêm trạng thái mới phải cập nhật `fulfillmentStatusPresentation` (kiểu `Record<FulfillmentStatus, StatusPresentation>` bắt lỗi biên dịch); tone theo hướng dẫn `StatusTone`.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.2.0 | 2026-11-03 | GHN auto handover, webhook-owned delivery outcome, detail polling và tests; API-20261103-GHN-HANDOVER. |
| 1.1.0 | 2026-10-10 | URL filters, `StatusTag`/tone, modal thao tác dùng `FormModal`, bỏ `shared/constants/fulfillment-status-presentation`. |
| 1.0.0 | 2026-09-13 | Tạo feature, lấp khoảng trống `listAdminFulfillments` chưa được dùng. |

## Vận đơn GHN tự tạo (D14)

- `carrierShipmentStatus` (`PENDING`/`CREATING`/`CREATED`/`CREATE_FAILED`, `null` = không áp dụng) hiện bằng `CarrierShipmentStatusTag` ở danh sách và panel giao vận của đơn; lỗi gần nhất lấy từ `carrierShipmentError`; mã lạ hiện "Không xác định".
- Nút "Tạo lại vận đơn" chỉ hiện khi `CREATE_FAILED` và có quyền `fulfillment.ship`; gọi `retryAdminFulfillmentCarrierShipment`, API trả 409 nếu không còn ở trạng thái lỗi.
- Khi vận đơn đã `CREATED`, bước bàn giao không hỏi mã vận đơn và không tạo vận đơn thứ hai.
- Khi detail có GHN provider/carrier hoặc phương thức STANDARD_DELIVERY/THIRD_PARTY, modal giải thích lấy snapshot từ đơn; request không gửi carrierCode/trackingNo tự nhập. Mã vận đơn do GHN cấp và API lưu.
- SHIPPED/GHN: các nút Đã giao/Giao thất bại bị disable và có hướng dẫn chờ webhook. API cũng chặn; UI không phải ranh giới bảo mật. Giao ngoài giữ thao tác cũ.
- Poll mỗi 15s chỉ GET backend projection khi SHIPPED/GHN, dừng khi kết thúc hoặc tab ở background; không polling hãng hoặc phát lệnh từ browser. Bảng/order parent vẫn có thể cần refresh theo policy màn cha.
