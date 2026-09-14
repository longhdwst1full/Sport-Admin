# Roles — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-14
>
> **Change summary:** Màn hình quản lý vai trò và tích chọn quyền; mở khoá bởi nhóm operation `*AdminRole` mới thêm ở `api/src/modules/iam`.

## Phạm vi

Tạo / sửa / xoá vai trò và gán tập quyền cho vai trò. **Không** gán vai trò cho người dùng — việc đó thuộc màn `access`.

## Operation sử dụng

| Operation | Dùng ở |
| --- | --- |
| `listAdminAllRoles` | bảng vai trò (gồm cả `INACTIVE`) |
| `listAdminPermissions` | cây quyền trong drawer |
| `createAdminRole` | nút Tạo vai trò |
| `updateAdminRole` | drawer sửa — đổi tên, mô tả, trạng thái, tập quyền |
| `deleteAdminRole` | nút xoá, kèm lý do |

`listAdminRoles` (chỉ `ACTIVE`) và `searchActiveAdminRoles` thuộc màn `access`, không dùng ở đây.

## Bất biến nghiệp vụ

- **Vai trò hệ thống (`system: true`) không xoá được và không đổi trạng thái được.** Mã nguồn tham chiếu tới `OWNER` / `BRANCH_MANAGER` / `STAFF` theo mã; xoá đi là hỏng phân quyền. Vẫn sửa được tên và tập quyền.
- **Mã vai trò không đổi sau khi tạo.** Ô mã bị khoá ở chế độ sửa.
- **Không cho tự nâng quyền.** Backend từ chối cấp quyền mà chính người thao tác không có; UI khoá sẵn các ô đó kèm tooltip. Quyền vai trò *đang có sẵn* được giữ lại trong tập cấp được, để người sửa không cần toàn quyền chỉ để đổi tên.
- **Chỉ phạm vi GLOBAL mới quản lý được vai trò.** Quản lý chi nhánh không tạo được vai trò.
- **Mọi lần ghi gửi `expectedVersion`.** Hai người cùng sửa thì người sau nhận 409.
- **Xoá chỉ khi vai trò chưa gán cho ai.** Backend đếm `user_role_assignments` trước khi xoá, và câu lệnh xoá còn kèm `assignments: { none: {} }` để chặn race.
- Đổi tập quyền làm tăng `permissionVersion` của mọi người đang giữ vai trò đó ⇒ phiên đang đăng nhập phải lấy token mới.

## Checklist khi sửa

- [ ] Thêm module quyền mới ở BE phải bổ sung nhãn vào `constants/role.constants.ts`, nếu không cây quyền hiện mã thô.
- [ ] Không bỏ `grantableCodes` khỏi `PermissionPicker` — đó là lớp UI của quy tắc chống leo thang đặc quyền.
- [ ] Không thêm ô cho phép sửa `code`.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-14 | Tạo màn hình quản lý vai trò. |
