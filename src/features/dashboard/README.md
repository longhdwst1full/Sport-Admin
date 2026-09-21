# Dashboard — maintenance note

> **Document version:** 2.2.0
>
> **Last updated:** 2026-09-21
>
> **Change summary:** Thêm bộ chọn kỳ (ngày/tháng/quý/năm), biểu đồ số đơn theo kỳ, bảng khách mua nhiều nhất và bảng màu biểu đồ đã qua kiểm tra tương phản/CVD.

## Biểu đồ và bảng màu

- Bộ chọn kỳ đổi **cả** `granularity` lẫn khoảng thời gian gửi lên: gom theo quý trên 30 ngày mặc
  định của Backend chỉ cho đúng một cột. Khoảng mặc định: ngày 30 ngày · tháng 12 tháng · quý 8 quý ·
  năm 5 năm.
- Biểu đồ doanh thu và biểu đồ số đơn dùng chung một khoảng và một mức gom, nên hai biểu đồ luôn nói
  về cùng một tập đơn.
- `CHART_COLORS` là bảng màu phân loại **thứ tự cố định**, không xoay vòng. Bảng cũ trượt kiểm tra:
  cặp hồng/đỏ cạnh nhau chỉ cách ΔE 11.4 với mắt thường (ngưỡng 15) và hai màu dưới 3:1 tương phản
  với nền. Bảng hiện tại đạt cả sáu kiểm tra ở nền sáng lẫn nền tối — đổi màu phải chạy lại trình
  kiểm tra, không ước lượng bằng mắt.
- Biểu đồ một chuỗi không dựng chú giải (tiêu đề thẻ đã nói đó là gì); biểu đồ nhiều chuỗi luôn có
  chú giải để danh tính không chỉ dựa vào màu.
- Hiệu ứng hiện thẻ tôn trọng `prefers-reduced-motion`.

## Phạm vi

Trang tổng quan cho người vận hành cửa hàng: doanh thu, đơn hàng, tồn kho cần nhập.
**Không** còn hiển thị số liệu về tiến độ code (số model đã rà soát, module có API) — đó là
thông tin dành cho người phát triển, không thuộc màn hình vận hành.

## Operation sử dụng

| Operation                   | Quyền                   | Dùng cho                                  |
| --------------------------- | ----------------------- | ----------------------------------------- |
| `getAdminReportOverview`    | `report.operation.view` | Thẻ đơn hàng, biểu đồ đơn theo trạng thái |
| `getAdminReportRevenue`     | `report.revenue.view`   | Thẻ doanh thu, biểu đồ theo ngày          |
| `getAdminReportInventory`   | `report.inventory.view` | Thẻ tồn dưới ngưỡng, bảng cần nhập thêm   |
| `getAdminReportTopProducts` | `report.revenue.view`   | Bảng bán chạy                             |

## Bất biến

- **Doanh thu là tiền đã thực nhận**, chỉ cộng đơn có `paymentStatus = SUCCESS`. Đơn COD chưa
  giao và chuyển khoản chờ xác nhận nằm ở `pendingRevenue`, không trộn vào doanh thu — trộn vào
  là báo lãi cho khoản tiền chưa về.
- **Số liệu bị giới hạn theo phạm vi chi nhánh** của người đăng nhập. Quản lý chi nhánh không
  nhìn thấy doanh thu toàn hệ thống.
- **Không gọi API doanh thu khi thiếu quyền.** `report.revenue.view` và `report.inventory.view`
  được kiểm ở client bằng `useCan` để không phát request chắc chắn bị từ chối; backend vẫn là
  nơi quyết định.
- Khối đơn chờ chỉ mount khi có `order.view`; quyền `order.manage` tiếp tục quyết định nút Duyệt.
  Route Dashboard không được phép tạo request 403 chỉ vì tài khoản có quyền báo cáo nhưng không
  có quyền xem đơn hàng.
- Mọi ô trống đều có empty state nói rõ lý do (chưa có dữ liệu / thiếu quyền), không hiện số 0
  gây hiểu nhầm là doanh thu bằng không.
- KPI dùng `DashboardStatCard`; loading của mỗi KPI đi theo đúng endpoint sở hữu dữ liệu. Không
  dùng trạng thái loading của Overview để che Revenue/Inventory hoặc ngược lại.
- Màu sắc, font, radius và shadow kế thừa Admin design tokens/Tailwind (`admin`, `slate`,
  `shadow-card`); không sao chép token riêng từ project tham chiếu.

## Checklist khi sửa

- [ ] Không đưa số liệu ước lượng hay chỉ số tăng trưởng viết cứng vào thẻ thống kê.
- [ ] Thêm trạng thái đơn mới phải cập nhật `ORDER_STATUS_LABELS`, nếu không biểu đồ hiện mã thô.
- [ ] Đổi định nghĩa doanh thu phải sửa đồng thời ở `api/src/modules/reporting/reporting.service.ts`.

## Revision history

| Version | Date       | Change summary                                                         |
| ------- | ---------- | ---------------------------------------------------------------------- |
| 2.1.0   | 2026-09-18 | Làm mới hierarchy, KPI, biểu đồ và thẻ đơn chờ; loading theo từng API. |
| 2.0.0   | 2026-09-15 | Chuyển sang số liệu kinh doanh thật; gỡ `system-module-list`.          |
| 1.0.0   | 2026-09-04 | Bản đầu, hiển thị tiến độ rà soát model.                               |
