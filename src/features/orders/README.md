# Orders — maintenance note

> **Document version:** 1.7.0
>
> **Last updated:** 2026-10-17
>
> **Change summary:** Thêm thao tác "Huỷ sau giao thất bại" (`cancelAdminOrderAfterFailedDelivery`) và bộ lọc link `AWAITING_SHIPMENT`. Trước đó: Tách drawer chi tiết theo trách nhiệm; mapper `model/order.mapper.ts`, policy `model/order-actions.policy.ts`, hook `hooks/use-order-action.ts`.

## Phạm vi

Feature hiển thị aggregate `orders`, snapshot người nhận/sản phẩm/tổng tiền và lịch sử trạng thái. Đây không phải danh sách checkout cần tư vấn giao hàng.

## Ranh giới và contract

- `pages/orders-page.tsx` sở hữu tab/search/page/pageSize và gọi `useListAdminOrders`.
- `components/order-table.tsx` chỉ trình bày `OrderRow` (map bằng `toOrderRow`) và phát action chọn order.
- `components/order-detail-drawer.tsx` tự tải detail qua `useGetAdminOrder`, map một lần bằng `toOrderDetailView` rồi ghép các thẻ `order-detail-header`, `order-recipient-card`, `order-payment-card`, `order-items-card`, `order-status-history-card`, `order-action-footer` (khung chung `order-info-card`).
- Điều kiện bật nút huỷ/xác nhận/hoàn tất ở `model/order-actions.policy.ts` (gương `order-transition.service.ts`); mutation + idempotency + invalidation ở `hooks/use-order-action.ts`. 409 thì tải lại chi tiết.
- Panel giao vận (`FulfillmentWorkflowPanel`) và nhãn trạng thái vận đơn (`FulfillmentStatusTag`) thuộc `fulfillments`; `OrderDetailDrawer` nhận qua prop `renderFulfillmentPanel` / `renderShipmentStatus` để không import ngược.
- Mọi request dùng `src/generated/api/orders`; không hard-code URL và không sửa file generated.
- Backend bắt buộc kiểm tra `order.view` và branch scope. Permission route phía FE chỉ cải thiện UX.
- Tab `Vận chuyển` map server-side sang `PICKING|PACKED|SHIPPED`; `Đã giao` map sang `DELIVERED|COMPLETED`.
- `AWAITING_SHIPMENT` (`CONFIRMED|PICKING|PACKED`) là nhóm chỉ-lọc cho link KPI "Đơn đang chờ giao" ở Dashboard; chỉ hiện thành tab khi URL `status=AWAITING_SHIPMENT` (`orderFilterOnlyTabs`).
- Search chạy server-side, mỗi ô một điều kiện AND: `orderNo`, `recipientName`, `recipientPhone`.
- `order.manage` mới hiển thị action. Hủy chỉ hợp lệ khi đơn chưa thanh toán/xử lý; manual complete chỉ hợp lệ sau khi giao đủ và thu đủ tiền, không giới hạn trong ngày.
- Fulfillment transition dùng permission riêng (`pick/pack/ship/delivery_update`), expected version và Idempotency-Key; Backend vẫn kiểm tra state/payment/stock/scope.
- Transition gửi `expectedVersion`, `Idempotency-Key` và lý do bắt buộc; Backend vẫn là nguồn quyết định cuối cùng.
- "Huỷ sau giao thất bại" (`cancelAdminOrderAfterFailedDelivery`, `order.manage`): nút chỉ hiện khi `SHIPPED` + fulfillment `RETURNED`. Hộp xác nhận (`useConfirmWithReason` + `OrderFailedDeliveryCancelSummary`) hiện trạng thái đơn/thanh toán, tổng đơn và hệ quả; lý do ≥ 3 ký tự. Đơn đã thu (payment `SUCCESS`) → API giữ `SUCCESS` + cờ hoàn tay, UI cảnh báo kế toán hoàn ngoài hệ thống rồi ghi nhận ở màn Thanh toán (`recordManualRefundAdmin`). `OrderDetailDto` không có số tiền đã thu nên chỉ hiện tổng đơn làm tham chiếu.
- Sau mutation, detail cache được cập nhật và toàn bộ list/tab Order được invalidate vì bản ghi có thể đổi tab.

## Checklist khi sửa

- [ ] Giữ đủ loading/error/empty/search debounce/pagination/detail states.
- [ ] Thay đổi status group phải sửa Backend/OpenAPI trước rồi regenerate SDK.
- [ ] Không thay Order bằng checkout consultation hoặc fixture.
- [ ] Mọi action transition sau này phải có expected version, permission, audit và refetch/invalidate rõ.
- [ ] Cập nhật Storybook khi table/layout đổi đáng kể.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.7.0 | 2026-10-17 | Huỷ sau giao thất bại (policy/hook/footer/hộp xác nhận + cảnh báo hoàn tay); tab chỉ-lọc `AWAITING_SHIPMENT`. | Dashboard KPI + failed-delivery review |
| 1.6.0 | 2026-10-13 | Tách drawer chi tiết thành thẻ con, mapper/policy có unit test; hiện giảm giá/thuế/ghi chú khách khi có; refetch chi tiết khi 409; báo lỗi khi sao chép mã thất bại. | Orders review |
| 1.5.0 | 2026-10-10 | `useUrlSearch`, page size 30 (`ADMIN_TABLE_DEFAULT_PAGE_SIZE`), `StatusTag`/tone, skeleton + `QueryErrorAlert`, `FormModal` cho xác nhận thao tác, nhãn người thao tác tiếng Việt. |
| 1.4.0 | 2026-09-19 | Pagination mặc định 20, chọn 20/50/100; refresh chuyển xuống dưới bảng và metric responsive đều cột. | Admin list UI review |
| 1.3.0 | 2026-09-13 | Thêm confirm Order và Fulfillment workflow/cache invalidation qua generated SDK. | DBAPI-20260913-FULFILLMENT-S43 |
| 1.2.0 | 2026-09-12 | Đổi copy và rule UI sang manual complete không giới hạn ngày sau DELIVERED/SUCCESS. | API-20260912-ORDER-GUEST-HARDENING |
| 1.1.1 | 2026-09-11 | Reset mutation/reason/idempotency khi đóng và thêm action confirmation stories. | ADMIN-20260911-ORDER-S41-HARDENING |
| 1.1.0 | 2026-09-11 | Thêm cancel/manual-complete transition UI qua generated SDK. | API-20260911-ORDER-OWN-ACCESS-TRANSITIONS |
| 1.0.0 | 2026-09-11 | Tạo Admin Order list/detail từ generated contract. | API-20260911-ORDER-FOUNDATION |
