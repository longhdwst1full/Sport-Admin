# Shipping consultations — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-09
>
> **Change summary:** Mô tả luồng Admin chốt phí giao riêng và ranh giới với Order Sprint sau.

## Phạm vi

Feature này cho nhân viên xem các checkout cần tư vấn, gọi khách và ghi nhận phương án giao đã thống nhất: phí, ETA, provider và agreement note. Sau khi lưu, khách đọc lại quote rồi tự xác nhận giữ hàng.

Feature không tạo Order, không xác nhận Payment, không dispatch Shipment và không sửa Inventory trực tiếp.

## Cấu trúc

| Thư mục/file | Vai trò |
| --- | --- |
| `pages/shipping-consultations-page.tsx` | Query orchestration, filter status, pagination và chọn record. |
| `components/shipping-consultation-table.tsx` | Trình bày danh sách và action mở drawer. |
| `components/shipping-consultation-drawer.tsx` | Form chốt phí/ETA/provider/note. |
| `constants/shipping-consultation.constants.ts` | Page size và presentation mapping. |
| `index.ts` | Public entry để router lazy import. |

## Contract và rule quan trọng

- Query dùng `useListAdminShippingConsultations`; mutation dùng `useUpdateAdminManualShippingQuote` từ generated SDK.
- `order.view` cho phép xem; `order.manage` mới được lưu thỏa thuận.
- Backend luôn áp branch scope. FE permission chỉ điều khiển UX, không thay thế authorization.
- Mutation gửi `expectedVersion`; conflict nghĩa là record đã đổi, cần tải lại trước khi ghi đè.
- `agreementNote` là bằng chứng vận hành, không được tự điền nội dung khách chưa đồng ý.
- Sau mutation thành công phải đóng drawer và refetch list; không tự sửa cache bằng shape đoán tay.

## Checklist khi sửa

- [ ] Giữ loading/error/empty/pagination khi đổi table.
- [ ] Field bắt buộc vẫn có `*` và điều kiện disabled khớp validation Backend.
- [ ] Không hard-code API path hoặc DTO riêng.
- [ ] Không đổi tên feature thành `orders` trước khi Order aggregate/API tồn tại.
- [ ] Cập nhật Storybook nếu table/drawer state thay đổi đáng kể.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-09 | Tạo maintenance note cho Admin shipping consultation. | DOC-20260909-FEATURE-MAINTENANCE-NOTES |
