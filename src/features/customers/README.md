# Customers — maintenance note

> **Document version:** 2.0.0
>
> **Last updated:** 2026-09-15
>
> **Change summary:** Gỡ fixture; màn hình chạy dữ liệu thật qua `Admin Customers`.

## Phạm vi

Danh sách và chi tiết khách hàng: thông tin liên hệ, số đơn, số tiền đã chi, địa chỉ đã lưu
và đơn hàng gần đây.

Ngoài phạm vi (giai đoạn 2): tạo khách thủ công, khoá/mở tài khoản, gộp khách trùng.

## Ranh giới và contract

- `pages/customers-page.tsx` sở hữu bộ lọc, phân trang và gọi `useListAdminCustomers`.
- `components/customer-detail-drawer.tsx` tự tải chi tiết qua `useGetAdminCustomer`; không
  đoán dữ liệu chi tiết từ dòng trong danh sách.
- `model/customer.mapper.ts` là nơi duy nhất đọc tên trường generated; component nhận view model.
- Lọc chạy server-side: mỗi ô là một điều kiện riêng, cộng dồn bằng AND — giống màn đơn hàng.
- Backend kiểm `customer.view`; route FE gate cùng quyền chỉ để cải thiện UX.

## Số liệu hiển thị

| Chỉ số | Định nghĩa |
| --- | --- |
| Số đơn | Đơn đã đặt, **không tính đơn đã huỷ** |
| Đã chi tiêu | Tổng tiền các đơn **đã thanh toán** và chưa huỷ — là tiền khách thực trả |
| Mua gần nhất | Lần đặt đơn gần nhất, không tính đơn đã huỷ |
| Loại khách | MEMBER nếu có tài khoản đăng nhập, GUEST nếu không. Suy ra, không phải cột riêng |

"Đã chi tiêu" đo theo trạng thái thanh toán chứ không theo trạng thái đơn: đơn bán tại quầy
dừng ở `DELIVERED` và không bao giờ tự chuyển `COMPLETED`, lấy theo `COMPLETED` sẽ làm mọi
khách mua tại quầy có số tiền bằng 0. Khác với báo cáo doanh thu — nơi `COMPLETED` là thực
nhận và `DELIVERED` là dự thu — vì hai chỗ trả lời hai câu hỏi khác nhau.

## Trường đã bỏ khỏi màn hình

Bản fixture cũ hiển thị "Xác minh qua" (PHONE/EMAIL/BOTH/NONE) và "Thẻ khách hàng" (VIP,
Runner...). Không trường nào có trong model `Customer`, nên chúng đã được gỡ thay vì bịa số
liệu (`RULE-CTR-02`). Muốn có lại thì thêm cột ở `api/`, sync contract rồi regenerate.

Trạng thái cũng chỉ còn ACTIVE/INACTIVE — `customers_status_check` không có
NEEDS_VERIFICATION hay BLOCKED như fixture từng hiển thị.

## Checklist khi sửa

- [ ] Giữ đủ loading/error/empty của bảng và ngăn chi tiết.
- [ ] Không hiển thị trường không có trong contract.
- [ ] Đổi định nghĩa "đã chi tiêu" phải sửa ở `AdminCustomerService`, không tính lại ở FE.
- [ ] Không hiển thị PII của khách ở nơi không cần.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 2.0.0 | 2026-09-15 | Gỡ fixture, nối `listAdminCustomers`/`getAdminCustomer`; bỏ hai trường không có nguồn. |
| 1.0.0 | 2026-09-13 | Tạo note, gắn nhãn fixture. |
