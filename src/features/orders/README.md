# Orders — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-11
>
> **Change summary:** Tạo màn quản lý Order thật, tab trạng thái, search server-side và detail timeline từ generated SDK.

## Phạm vi

Feature hiển thị aggregate `orders`, snapshot người nhận/sản phẩm/tổng tiền và lịch sử trạng thái. Đây không phải danh sách checkout cần tư vấn giao hàng.

## Ranh giới và contract

- `pages/orders-page.tsx` sở hữu tab/search/page và gọi `useListAdminOrders`.
- `components/order-table.tsx` chỉ trình bày danh sách và phát action chọn order.
- `components/order-detail-drawer.tsx` tự tải detail qua `useGetAdminOrder`; không dùng summary để đoán dữ liệu chi tiết.
- Mọi request dùng `src/generated/api/orders`; không hard-code URL và không sửa file generated.
- Backend bắt buộc kiểm tra `order.view` và branch scope. Permission route phía FE chỉ cải thiện UX.
- Tab `Vận chuyển` map server-side sang `PICKING|PACKED|SHIPPED`; `Đã giao` map sang `DELIVERED|COMPLETED`.
- Search chạy server-side theo `orderNo`, tên, SĐT và email người nhận.

## Checklist khi sửa

- [ ] Giữ đủ loading/error/empty/search debounce/pagination/detail states.
- [ ] Thay đổi status group phải sửa Backend/OpenAPI trước rồi regenerate SDK.
- [ ] Không thay Order bằng checkout consultation hoặc fixture.
- [ ] Mọi action transition sau này phải có expected version, permission, audit và refetch/invalidate rõ.
- [ ] Cập nhật Storybook khi table/layout đổi đáng kể.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-11 | Tạo Admin Order list/detail từ generated contract. | API-20260911-ORDER-FOUNDATION |

