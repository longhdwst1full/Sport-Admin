# Customers — maintenance note

> **Document version:** 2.1.1
>
> **Last updated:** 2026-09-18
>
> **Change summary:** Đặt accessible name cho Drawer tạo/sửa khách và bổ sung Playwright cho tìm kiếm, validation, tạo hồ sơ, quyền.

## Phạm vi

Danh sách và chi tiết khách hàng: thông tin liên hệ, số đơn, số tiền đã chi, địa chỉ đã lưu
và đơn hàng gần đây.

Ngoài phạm vi: gộp khách trùng và quản lý credential của tài khoản MEMBER.

## Ranh giới và contract

- `pages/customers-page.tsx` sở hữu bộ lọc, phân trang và gọi `useListAdminCustomers`.
- `components/customer-detail-drawer.tsx` tự tải chi tiết qua `useGetAdminCustomer`; không
  đoán dữ liệu chi tiết từ dòng trong danh sách.
- `model/customer.mapper.ts` là nơi duy nhất đọc tên trường generated; component nhận view model.
- Lọc chạy server-side: mỗi ô là một điều kiện riêng, cộng dồn bằng AND — giống màn đơn hàng.
- Backend kiểm `customer.view`; route FE gate cùng quyền chỉ để cải thiện UX.
- Tạo/sửa/ngừng/mở/xóa dùng generated mutation và quyền `customer.manage`.
- Nút tạo hồ sơ độc lập chỉ hiện cho scope GLOBAL. Người dùng theo chi nhánh tạo khách qua POS/đơn
  hàng vì customer không có `branch_id` riêng.
- Mutation thành công invalidate cả list và detail; delete loại detail cache để không hiện dữ liệu cũ.

## Quy tắc mutation

- Form luôn yêu cầu tên và ít nhất email hoặc SĐT; backend kiểm lại cùng invariant.
- Có thể xóa email nếu vẫn còn SĐT và ngược lại.
- Update/lifecycle/delete gửi `expectedVersion` để báo conflict khi hai người cùng sửa.
- MEMBER hoặc khách đã có đơn không được xóa; dùng Ngừng hoạt động để giữ lịch sử.
- Không hiển thị action quản lý nếu thiếu `customer.manage`; backend vẫn kiểm permission/scope.

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
- [ ] Mutation phải refresh list/detail đúng key và map validation server về field.
- [ ] Không cho branch-scoped user tạo hồ sơ khách độc lập.
- [ ] Drawer tạo/sửa có accessible name để bàn phím, screen reader và E2E xác định đúng.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 2.1.1 | 2026-09-18 | Accessible name cho Drawer và Playwright luồng khách hàng. |
| 2.1.0 | 2026-09-18 | Hoàn thiện CRUD, GLOBAL-only standalone create, contact invariant và cache invalidation. |
| 2.0.0 | 2026-09-15 | Gỡ fixture, nối `listAdminCustomers`/`getAdminCustomer`; bỏ hai trường không có nguồn. |
| 1.0.0 | 2026-09-13 | Tạo note, gắn nhãn fixture. |
