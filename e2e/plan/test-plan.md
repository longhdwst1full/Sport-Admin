# Kế hoạch E2E — DCTD Admin

> **Version:** 1.1.0 · **Last updated:** 2026-09-18
> **Change summary:** Bổ sung kịch bản Khách hàng và ưu tiên luồng mutation/ràng buộc quyền theo kết quả chạy Playwright.

Quy trình và quy ước: xem `e2e/README.md`.

## 1. Bản đồ feature ↔ route ↔ quyền

| Feature | Route | Quyền gác route |
| --- | --- | --- |
| dashboard | `/` | `report.operation.view` \| `report.revenue.view` \| `report.inventory.view` |
| orders | `/orders` | `order.view` |
| pos | `/pos` | `order.manage` |
| fulfillments | `/fulfillments` | `fulfillment.view` |
| customers | `/customers` | `customer.view` |
| payments | `/payments` | `payment.view` |
| products | `/products` | `catalog.product.view` |
| catalog-masters | `/catalog-masters` | `catalog.brand.view` |
| flash-sales | `/flash-sales` | `catalog.flash_sale.view` |
| reviews | `/reviews` | `catalog.review.moderate` |
| inventory | `/inventory` | `inventory.stock.view` |
| content | `/content` | `cms.content.view` |
| organization | `/organization` | `org.branch.view` |
| access | `/access` | `iam.user.view` |
| roles | `/roles` | `iam.role.view` |
| audit | `/audit` | `iam.audit.view` |
| system-parameters | `/system-parameters` | `system.parameter.view` |
| auth | `/login`, `/change-password` | — |

## 2. Thứ tự triển khai

| Giai đoạn | Nội dung | Trạng thái |
| --- | --- | --- |
| P0 | Hạ tầng: config, fixture session, mock API, page object | ✅ xong |
| P0 | AUTH — đăng nhập, ép đổi mật khẩu, chặn route khi chưa đăng nhập | ✅ 5 case |
| P0 | RBAC — menu/route/affordance theo quyền | ✅ 3 case |
| P0 | CATALOG — danh sách sản phẩm (data/empty/error/filter/paging) | ✅ 5 case |
| P0 | CUSTOMERS — tìm kiếm, validation, tạo và quyền quản lý | ✅ 4 case |
| P1 | ORDERS — danh sách + chi tiết + chuyển trạng thái có xác nhận | ⬜ backlog §4 |
| P1 | INVENTORY — điều chỉnh tồn (idempotency key, xác nhận) | ⬜ |
| P1 | PRODUCTS — tạo/sửa/xoá mềm, lỗi validate theo field, concurrency 409 | ⬜ |
| P2 | POS, FULFILLMENTS, PAYMENTS, REVIEWS | ⬜ |
| P2 | IAM: access/roles/audit | ⬜ |
| P3 | Cross-cutting: skeleton loading, giữ selection khi refetch, đồng bộ filter lên URL | ⬜ |

Tiêu chí ưu tiên: rủi ro nghiệp vụ (tiền, tồn kho, quyền) > tần suất dùng > độ phức tạp luồng.

## 3. Testcase đã có

### AUTH — `e2e/specs/auth-login.spec.ts`

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| AUTH-01 | Mật khẩu < 8 ký tự | Hiện lỗi validate, **không** gọi API login |
| AUTH-02 | API trả 401 | Hiện message từ API, vẫn ở `/login` |
| AUTH-03 | Đăng nhập hợp lệ | Rời `/login`, vào khu quản trị |
| AUTH-04 | `mustChangePassword = true` | Chuyển `/change-password` |
| AUTH-05 | Chưa đăng nhập, mở `/products` | Chuyển về `/login` |

### RBAC — `e2e/specs/permissions-navigation.spec.ts`

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| RBAC-01 | Chỉ `catalog.product.view` | Vào được `/products`; menu **không** có "Đơn hàng" |
| RBAC-02 | Thiếu `iam.role.view`, mở `/roles` | Không render nội dung trang Vai trò |
| RBAC-03 | Thiếu `catalog.product.manage` | Nút "Thêm sản phẩm" không tồn tại |

### CATALOG — `e2e/specs/products-list.spec.ts`

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| PRD-01 | API trả 1 sản phẩm | Bảng hiện đúng dòng |
| PRD-02 | API trả rỗng | Hiện trạng thái trống, không trắng trang |
| PRD-03 | API trả 500 | Hiện alert lỗi kèm message API, trang vẫn render |
| PRD-04 | Nhập ô "Tên sản phẩm" | Sau debounce gọi API với `name=...` và `page=1` |
| PRD-05 | Bấm trang 2 | Gọi lại API với `page=2` |

### CUSTOMERS — `e2e/specs/customers-crud.spec.ts`

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| CUS-01 | Nhập tên khách | API nhận `name`, `page=1`; bảng giữ dữ liệu |
| CUS-02 | Tạo khách không có email và SĐT | Báo lỗi tại form, không POST |
| CUS-03 | Tạo khách hợp lệ | POST đúng DTO, đóng drawer sau thành công, list refetch |
| CUS-04 | Chỉ có `customer.view` | Vẫn xem list, không thấy nút tạo |

## 4. Backlog testcase (chưa hiện thực)

### ORDERS

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| ORD-01 | Mở `/orders` có dữ liệu | Bảng hiện đúng mã đơn, trạng thái, tổng tiền |
| ORD-02 | Lọc theo trạng thái | Gửi query trạng thái, reset về trang 1 |
| ORD-03 | Mở chi tiết một đơn | Hiện dòng hàng, khách, lịch sử trạng thái |
| ORD-04 | Xác nhận đơn | Có dialog nêu trạng thái hiện tại + hậu quả; huỷ dialog thì không gọi API |
| ORD-05 | Xác nhận đơn thành công | Gọi API kèm idempotency key, invalidate list + detail, hiện thông báo |
| ORD-06 | API trả 409 (bản cũ) | Hiện lỗi xung đột, không đóng dialog, giữ dữ liệu người dùng nhập |
| ORD-07 | Thiếu `order.manage` | Nút chuyển trạng thái bị ẩn/disable |

### INVENTORY

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| INV-01 | Mở `/inventory` | Hiện tồn theo kho, phân trang server |
| INV-02 | Điều chỉnh tồn | Form validate số lượng/lý do theo contract |
| INV-03 | Gửi điều chỉnh | Request có idempotency key; gửi lại không nhân đôi |
| INV-04 | API 422 theo field | Lỗi hiển thị đúng field, form không đóng |
| INV-05 | Thiếu `inventory.stock.adjust` | Không có affordance điều chỉnh |

### PRODUCTS (CRUD)

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| PRD-10 | Mở form tạo | Trường bắt buộc, enum, giới hạn đúng theo DTO |
| PRD-11 | Tạo thành công | Đóng modal, refetch list, hiện thông báo |
| PRD-12 | Tạo lỗi transport | Modal **không** đóng, giữ nguyên dữ liệu đã nhập |
| PRD-13 | Sửa | Định danh bất biến bị disable và không nằm trong payload update |
| PRD-14 | Xoá | Dialog nêu rõ "chuyển sang Lưu trữ"; huỷ thì không gọi API |
| PRD-15 | Xoá với version cũ | 409 hiển thị rõ, danh sách được refetch |

### Cross-cutting

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| UX-01 | Lần tải đầu, API chậm | Hiện skeleton khớp layout, không phải spinner toàn trang |
| UX-02 | Refetch khi đã có dữ liệu | Giữ nguyên dòng, chỉ loading ở bảng |
| UX-03 | Đổi filter | Reset về trang 1, huỷ request cũ |
| UX-04 | Reload sau khi lọc | Filter/page khôi phục từ URL |
| UX-05 | Mutation đang chạy | Disable nút submit, không khoá cả trang |
| UX-06 | API trả 403 | Hiện thông báo thiếu quyền, không đăng xuất người dùng |

### CUSTOMERS tiếp theo

| ID | Điều kiện | Kết quả mong đợi |
| --- | --- | --- |
| CUS-05 | Sửa khách từ row | Điền dữ liệu hiện tại; PATCH có `expectedVersion`, không ghi đè âm thầm |
| CUS-06 | API trả 409 khi sửa | Drawer vẫn mở, dữ liệu người dùng giữ nguyên, báo xung đột |
| CUS-07 | Khách đã có đơn | Nút xoá bị vô hiệu; ngừng hoạt động vẫn cần xác nhận |
| CUS-08 | Scope chỉ chi nhánh | Không thấy tạo hồ sơ độc lập dù có `customer.manage` |

## 5. Definition of done cho một spec

- Có ID và tiêu đề theo quy ước; mock khớp DTO generated.
- Assert cả trạng thái đúng lẫn trạng thái **không được phép xuất hiện**.
- Không `waitForTimeout`, không phụ thuộc thứ tự test.
- Chạy xanh 3 lần liên tiếp cục bộ trước khi đưa vào CI.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.1.0 | 2026-09-18 | Thêm 4 ca Customers và backlog concurrency/scope. |
| 1.0.0 | 2026-09-16 | Kế hoạch ban đầu cho Auth, RBAC, Catalog và backlog. |
