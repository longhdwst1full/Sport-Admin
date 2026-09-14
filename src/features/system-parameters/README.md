# System parameters — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-14
>
> **Change summary:** Màn hình quản lý tham số nghiệp vụ; kế thừa pattern `msttparameter` của `fund-ops-service`.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Xem, sửa giá trị, tạo và ngừng dùng tham số nghiệp vụ | Bí mật và cấu hình hạ tầng — vẫn ở biến môi trường |
| Bật/tắt cho Storefront đọc (`isPublic`) | Định nghĩa tham số mới cho code dùng — phải khai báo trong catalog ở `api/` |

## Hai loại tham số — quyết định giao diện dựa vào đây

| | `isSystem = true` | `isSystem = false` |
| --- | --- | --- |
| Biểu tượng | 🔒 ổ khoá cạnh mã | không |
| Sửa được | chỉ ô **Giá trị** và **Lý do** | toàn bộ |
| Nút ngừng dùng | disabled | bật |

Lý do: code đọc tham số hệ thống theo mã. Cho sửa mã hoặc xoá thì service âm thầm rơi về mặc định — lỗi khó phát hiện nhất. Backend cũng chặn bằng 409, giao diện chỉ làm rõ trước.

## Generated operation

`useListAdminSystemParameters`, `createAdminSystemParameter`, `updateAdminSystemParameter`, `deleteAdminSystemParameter` — `src/generated/api/system`.

Danh sách chạy server-side: phân trang, tìm theo mã/tên, lọc nhóm và trạng thái, sắp xếp qua whitelist trường.

## Quy tắc khi thao tác

- **Mọi lần ghi đều gửi `expectedVersion`.** Hai người cùng sửa thì người sau nhận 409 chứ không ghi đè.
- **Sửa và ngừng dùng đều bắt buộc nhập lý do** (≥ 5 ký tự), lưu vào `remarks` và audit log.
- **Ngừng dùng là xoá mềm** — bản ghi chuyển `INACTIVE`, không mất khỏi database.
- Backend kiểm tra kiểu và khoảng min/max; giao diện hiển thị khoảng hợp lệ và giá trị mặc định ngay dưới ô nhập.

## Hiệu lực tức thì

Sửa xong là có hiệu lực ngay ở lần đọc kế tiếp (backend xoá cache sau mỗi lần ghi). Đã kiểm chứng: đổi phí giao bậc nhẹ 50.000 → 65.000 thì báo giá checkout ngay sau đó trả `shippingTotal = 65.000`.

## Checklist khi sửa

- [ ] Không thêm ô cho phép sửa `code`, `valueType` của tham số hệ thống.
- [ ] Thêm nhóm mới phải cập nhật `parameterGroupLabels`, nếu không bảng hiện mã thô.
- [ ] Không hiển thị bất kỳ giá trị nào lấy từ biến môi trường ở màn hình này.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-14 | Tạo màn hình quản lý tham số. |
