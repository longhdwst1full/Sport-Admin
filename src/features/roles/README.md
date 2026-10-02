# Roles — maintenance note

> **Document version:** 1.3.0
>
> **Last updated:** 2026-10-03
>
> **Change summary:** Xoá vai trò theo API D98: nút Xoá bật theo `canDelete` của server, hộp xác nhận nêu `activeAssignmentCount` sẽ chuyển về Nhân viên, toast theo `affectedUsers`, map lỗi `IAM_ROLE_*`; bỏ thao tác "ngừng vai trò hệ thống" qua DELETE.

## Phạm vi

Tạo / sửa / xoá vai trò và gán tập quyền cho vai trò. **Không** gán vai trò cho người dùng — việc đó thuộc màn `access`.

## Operation sử dụng

| Operation | Dùng ở |
| --- | --- |
| `listAdminAllRoles` | bảng vai trò (gồm cả `INACTIVE`) |
| `listAdminPermissions` | cây quyền trong drawer |
| `createAdminRole` | nút Tạo vai trò |
| `updateAdminRole` | drawer sửa — đổi tên, mô tả, trạng thái, tập quyền |
| `deleteAdminRole` | nút Xoá, kèm lý do; trả `{ outcome, movedAssignments, affectedUsers }` |

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
- **Vai trò hệ thống và vai trò quản trị không xoá được (D98).** API trả 403 `IAM_ROLE_PROTECTED`; UI khoá nút theo `canDelete` server tính, không tự suy luật. Ngừng vai trò hệ thống làm ở màn Sửa (trạng thái).
- **Xoá vai trò tự tạo chuyển người đang giữ về Nhân viên.** Mỗi phân quyền đang hoạt động được chuyển về STAFF cùng chi nhánh/phạm vi; hộp xác nhận hiện `activeAssignmentCount`, toast "Đã chuyển n nhân viên về vai trò Nhân viên" đếm theo `affectedUsers` (một người có thể giữ vai trò ở nhiều chi nhánh). Còn lịch sử phân quyền thì API chỉ chuyển vai trò sang INACTIVE.
- Lỗi xoá map theo mã (`model/role-lifecycle.policy.ts`); 404, `IAM_ROLE_VERSION_CONFLICT`, `IAM_ROLE_PROTECTED` tải lại danh sách.
- **Mã vai trò không đổi sau khi tạo.** Ô mã bị khoá ở chế độ sửa.
- **Không cho tự nâng quyền.** Backend từ chối cấp quyền mà chính người thao tác không có; UI khoá sẵn các ô đó kèm tooltip. Quyền vai trò *đang có sẵn* được giữ lại trong tập cấp được, để người sửa không cần toàn quyền chỉ để đổi tên.
- **Chỉ phạm vi GLOBAL mới quản lý được vai trò.** Quản lý chi nhánh không tạo được vai trò.
- **Mọi lần ghi gửi `expectedVersion`.** Hai người cùng sửa thì người sau nhận 409.
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
| 1.3.0 | 2026-10-03 | Xoá vai trò theo API D98: `canDelete`, `activeAssignmentCount` trong xác nhận, toast `affectedUsers`, lỗi `IAM_ROLE_*`. |
| 1.2.0 | 2026-10-02 | Thêm tab "Menu hiển thị" và xem trước menu theo vai trò (suy ra từ quyền, không có màn menu); gắn họ quyền nhập hàng/NCC và `catalog.review.reply` vào màn có sẵn. |
