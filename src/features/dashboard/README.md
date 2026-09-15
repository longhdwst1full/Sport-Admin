# Dashboard — maintenance note

> **Document version:** 2.0.0
>
> **Last updated:** 2026-09-15
>
> **Change summary:** Thay số liệu tiến độ lập trình bằng số liệu kinh doanh thật từ module `Admin Reporting`.

## Phạm vi

Trang tổng quan cho người vận hành cửa hàng: doanh thu, đơn hàng, tồn kho cần nhập.
**Không** còn hiển thị số liệu về tiến độ code (số model đã rà soát, module có API) — đó là
thông tin dành cho người phát triển, không thuộc màn hình vận hành.

## Operation sử dụng

| Operation | Quyền | Dùng cho |
| --- | --- | --- |
| `getAdminReportOverview` | `report.operation.view` | Thẻ đơn hàng, biểu đồ đơn theo trạng thái |
| `getAdminReportRevenue` | `report.revenue.view` | Thẻ doanh thu, biểu đồ theo ngày |
| `getAdminReportInventory` | `report.inventory.view` | Thẻ tồn dưới ngưỡng, bảng cần nhập thêm |
| `getAdminReportTopProducts` | `report.revenue.view` | Bảng bán chạy |

## Bất biến

- **Doanh thu là tiền đã thực nhận**, chỉ cộng đơn có `paymentStatus = SUCCESS`. Đơn COD chưa
  giao và chuyển khoản chờ xác nhận nằm ở `pendingRevenue`, không trộn vào doanh thu — trộn vào
  là báo lãi cho khoản tiền chưa về.
- **Số liệu bị giới hạn theo phạm vi chi nhánh** của người đăng nhập. Quản lý chi nhánh không
  nhìn thấy doanh thu toàn hệ thống.
- **Không gọi API doanh thu khi thiếu quyền.** `report.revenue.view` và `report.inventory.view`
  được kiểm ở client bằng `useCan` để không phát request chắc chắn bị từ chối; backend vẫn là
  nơi quyết định.
- Mọi ô trống đều có empty state nói rõ lý do (chưa có dữ liệu / thiếu quyền), không hiện số 0
  gây hiểu nhầm là doanh thu bằng không.

## Checklist khi sửa

- [ ] Không đưa số liệu ước lượng hay chỉ số tăng trưởng viết cứng vào thẻ thống kê.
- [ ] Thêm trạng thái đơn mới phải cập nhật `ORDER_STATUS_LABELS`, nếu không biểu đồ hiện mã thô.
- [ ] Đổi định nghĩa doanh thu phải sửa đồng thời ở `api/src/modules/reporting/reporting.service.ts`.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 2.0.0 | 2026-09-15 | Chuyển sang số liệu kinh doanh thật; gỡ `system-module-list`. |
| 1.0.0 | 2026-09-04 | Bản đầu, hiển thị tiến độ rà soát model. |
