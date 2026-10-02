# Roles — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-10-02
>
> **Change summary:** Vai trò quyết định cả menu hiển thị: tab "Menu hiển thị" bật/tắt từng mục menu (= cấp/gỡ quyền xem của màn), bảng xem trước menu của vai trò; không có màn quản lý menu riêng.

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

## Menu theo vai trò (không có màn quản lý menu)

Menu **suy ra từ quyền**, không lưu riêng — giống `admin-client` (menu lọc theo quyền `*_view` của route). Nguồn duy nhất là `NAVIGATION_ITEMS_DATA` (`shared/constants/navigation.ts`): mỗi mục khai mã quyền làm nó hiện, sidebar/`PermissionRoute` và màn này cùng dùng `canSeeNavigationItem`.

- Drawer có hai tab cùng ghi field `permissionCodes`: **Menu hiển thị** (`components/menu-access-panel.tsx`) và **Chi tiết quyền** (`PermissionPicker`).
- Bật một mục = thêm mã xem của nó (chỉ mã người thao tác cấp được). Tắt = bỏ mọi mã xem của mục; quyền thao tác `*.manage`... giữ nguyên.
- Mục dùng chung mã (Sản phẩm/Thuộc tính → `catalog.product.view`; Tham số hệ thống/Thông báo email → `system.parameter.view`) được gắn tag "Chung quyền": bật/tắt một mục đổi cả mục kia.
- Bảng vai trò, khi mở dòng, hiện "Menu sẽ hiển thị".
- Panel cảnh báo nếu menu khai mã không có trong catalog `listAdminPermissions`.
- Logic thuần nằm ở `model/menu-visibility.ts`.

Cây quyền có ba tầng **nhóm menu → màn hình → hành động**. Nhóm/màn hình có thể thu gọn; lọc theo chữ mở lại các kết quả khớp. Chỉ mã quyền ở lá được gửi lên API.

## Bất biến nghiệp vụ

- **OWNER không xoá/ngừng được.** Đây là vai trò quản trị gốc duy nhất; khóa nó có thể khiến toàn hệ thống không còn người quản trị.
- **DELETE BRANCH_MANAGER/STAFF là ngừng hoạt động, không xóa vật lý.** Người đang được gán mất quyền ngay qua `permissionVersion`; lịch sử vẫn giữ và Admin có thể kích hoạt lại bằng màn Sửa.
- **Vai trò tự tạo chỉ xóa vật lý khi chưa từng được gán.** Backend kiểm tra assignment và optimistic version trước khi xóa.
- **Mã vai trò không đổi sau khi tạo.** Ô mã bị khoá ở chế độ sửa.
- **Không cho tự nâng quyền.** Backend từ chối cấp quyền mà chính người thao tác không có; UI khoá sẵn các ô đó kèm tooltip. Quyền vai trò *đang có sẵn* được giữ lại trong tập cấp được, để người sửa không cần toàn quyền chỉ để đổi tên.
- **Chỉ phạm vi GLOBAL mới quản lý được vai trò.** Quản lý chi nhánh không tạo được vai trò.
- **Mọi lần ghi gửi `expectedVersion`.** Hai người cùng sửa thì người sau nhận 409.
- **Xoá vai trò tự tạo chỉ khi chưa gán cho ai.** Backend đếm `user_role_assignments` trước khi xoá, và câu lệnh xoá còn kèm `assignments: { none: {} }` để chặn race.
- Đổi tập quyền làm tăng `permissionVersion` của mọi người đang giữ vai trò đó ⇒ phiên đang đăng nhập phải lấy token mới.

## Checklist khi sửa

- [ ] Thêm module quyền mới ở BE phải bổ sung nhãn vào `constants/role.constants.ts`, nếu không cây quyền hiện mã thô.
- [ ] Không bỏ `grantableCodes` khỏi `PermissionPicker` — đó là lớp UI của quy tắc chống leo thang đặc quyền.
- [ ] Không thêm ô cho phép sửa `code`.
- [ ] Thêm/sửa mục menu chỉ ở `NAVIGATION_ITEMS_DATA`; không tạo danh sách menu thứ hai trong feature này.
- [ ] Họ quyền mới thuộc một màn có sẵn phải khai `FAMILY_TO_SCREEN_PERMISSION`, nếu không rơi vào "Chưa có màn hình".

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-14 | Tạo màn hình quản lý vai trò. |
| 1.0.1 | 2026-09-18 | Cho phép thu gọn cây quyền và ghi rõ cách nhóm theo màn hình. |
| 1.1.0 | 2026-09-19 | Thêm lifecycle an toàn cho vai trò hệ thống, xác nhận theo hậu quả và cây quyền mở rộng trong bảng. |
| 1.2.0 | 2026-10-02 | Thêm tab "Menu hiển thị" và xem trước menu theo vai trò (suy ra từ quyền, không có màn menu); gắn họ quyền nhập hàng/NCC và `catalog.review.reply` vào màn có sẵn. |
