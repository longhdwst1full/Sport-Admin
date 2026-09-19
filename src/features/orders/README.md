# Orders — maintenance note

> **Document version:** 1.4.0
>
> **Last updated:** 2026-09-19
>
> **Change summary:** Chuẩn hóa responsive, phân trang server-side 20/50/100 dòng và chuyển làm mới xuống dưới bảng.

## Phạm vi

Feature hiển thị aggregate `orders`, snapshot người nhận/sản phẩm/tổng tiền và lịch sử trạng thái. Đây không phải danh sách checkout cần tư vấn giao hàng.

## Ranh giới và contract

- `pages/orders-page.tsx` sở hữu tab/search/page/pageSize và gọi `useListAdminOrders`.
- `components/order-table.tsx` chỉ trình bày danh sách và phát action chọn order.
- `components/order-detail-drawer.tsx` tự tải detail qua `useGetAdminOrder`; không dùng summary để đoán dữ liệu chi tiết.
- `components/fulfillment-workflow-panel.tsx` tải Fulfillment theo Order và chỉ mở action hợp lệ với status/permission hiện tại.
- Mọi request dùng `src/generated/api/orders`; không hard-code URL và không sửa file generated.
- Backend bắt buộc kiểm tra `order.view` và branch scope. Permission route phía FE chỉ cải thiện UX.
- Tab `Vận chuyển` map server-side sang `PICKING|PACKED|SHIPPED`; `Đã giao` map sang `DELIVERED|COMPLETED`.
- Search chạy server-side theo `orderNo`, tên, SĐT và email người nhận.
- `order.manage` mới hiển thị action. Hủy chỉ hợp lệ khi đơn chưa thanh toán/xử lý; manual complete chỉ hợp lệ sau khi giao đủ và thu đủ tiền, không giới hạn trong ngày.
- Fulfillment transition dùng permission riêng (`pick/pack/ship/delivery_update`), expected version và Idempotency-Key; Backend vẫn kiểm tra state/payment/stock/scope.
- Transition gửi `expectedVersion`, `Idempotency-Key` và lý do bắt buộc; Backend vẫn là nguồn quyết định cuối cùng.
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
| 1.4.0 | 2026-09-19 | Pagination mặc định 20, chọn 20/50/100; refresh chuyển xuống dưới bảng và metric responsive đều cột. | Admin list UI review |
| 1.3.0 | 2026-09-13 | Thêm confirm Order và Fulfillment workflow/cache invalidation qua generated SDK. | DBAPI-20260913-FULFILLMENT-S43 |
| 1.2.0 | 2026-09-12 | Đổi copy và rule UI sang manual complete không giới hạn ngày sau DELIVERED/SUCCESS. | API-20260912-ORDER-GUEST-HARDENING |
| 1.1.1 | 2026-09-11 | Reset mutation/reason/idempotency khi đóng và thêm action confirmation stories. | ADMIN-20260911-ORDER-S41-HARDENING |
| 1.1.0 | 2026-09-11 | Thêm cancel/manual-complete transition UI qua generated SDK. | API-20260911-ORDER-OWN-ACCESS-TRANSITIONS |
| 1.0.0 | 2026-09-11 | Tạo Admin Order list/detail từ generated contract. | API-20260911-ORDER-FOUNDATION |
