# Roles — maintenance note

> **Document version:** 1.6.0
>
> **Last updated:** 2026-10-17
>
> **Change summary:** Xoá vai trò chỉ Chủ hệ thống; `RoleDeleteModal` hai bước (chuyển sang vai trò đang hoạt động bất kỳ, hoặc xử lý tài khoản không còn vai trò: Ngừng hoạt động / Xoá); tooltip theo `deleteBlockedReason`; lỗi `IAM_ROLE_*` mới.

## Phạm vi

Tạo / sửa / xoá vai trò và gán tập quyền cho vai trò. **Không** gán vai trò cho người dùng — việc đó thuộc màn `access`.

## Operation sử dụng

| Operation | Dùng ở |
| --- | --- |
| `listAdminAllRoles` | bảng vai trò (gồm cả `INACTIVE`) |
| `listAdminPermissions` | cây quyền trong drawer |
| `createAdminRole` | nút Tạo vai trò |
| `updateAdminRole` | drawer sửa — đổi tên, mô tả, trạng thái, tập quyền |
| `deleteAdminRole` | nút Xoá → `RoleDeleteModal`, gửi `{ expectedVersion, reason, fallbackRoleId? \| orphanAction? }` (`toDeleteRolePayload`); trả `{ outcome, fallbackRoleId?, orphanAction?, movedAssignments, revokedAssignments, deactivatedUsers, deletedUsers, affectedUsers }` |

`listAdminRoles` (chỉ `ACTIVE`) và `searchActiveAdminRoles` thuộc màn `access`, không dùng ở đây.

## Menu theo vai trò (không có màn quản lý menu)

Menu **suy ra từ quyền**, không lưu riêng — giống `admin-client` (menu lọc theo quyền `*_view` của route). Nguồn duy nhất là `NAVIGATION_ITEMS_DATA` (`shared/constants/navigation.ts`): mỗi mục khai mã quyền làm nó hiện, sidebar/`PermissionRoute` và màn này cùng dùng `canSeeNavigationItem`.

- Drawer có hai tab cùng ghi field `permissionCodes`: **Menu hiển thị** (`components/menu-access-panel.tsx`) và **Chi tiết quyền** (`PermissionPicker`).
- Bật một mục = thêm mã xem của nó (chỉ mã người thao tác cấp được). Tắt = bỏ mọi mã xem của mục; quyền thao tác `*.manage`... giữ nguyên.
- Mục dùng chung mã (Sản phẩm/Thuộc tính → `catalog.product.view`; Tham số hệ thống/Thông báo email → `system.parameter.view`) được gắn tag "Chung quyền": bật/tắt một mục đổi cả mục kia.
- Bảng vai trò chỉ tóm tắt (vài mã đầu + "+N"). Nút "Xem chi tiết" ở cột thao tác và "Xem thêm" ở cột Mã quyền cùng mở `components/role-permissions-drawer.tsx` (chỉ đọc): "Menu sẽ hiển thị" + cây quyền theo màn hình có ô tìm, đếm số quyền mỗi nhóm/màn, mở hết mặc định. `PermissionCodesCell` và `RolePermissionsDrawer` được xuất qua barrel cho tab Vai trò của `features/access`.
- Logic tóm tắt/lọc/cây của một vai trò ở `model/role-permission-view.ts` (có test).
- Panel cảnh báo nếu menu khai mã không có trong catalog `listAdminPermissions`.
- Logic thuần nằm ở `model/menu-visibility.ts`; mutation lưu/xoá vai trò ở `hooks/use-role-mutations.ts`.

Cây quyền có ba tầng **nhóm menu → màn hình → hành động**. Nhóm/màn hình có thể thu gọn; lọc theo chữ mở lại các kết quả khớp. Chỉ mã quyền ở lá được gửi lên API.

## Bất biến nghiệp vụ

- **OWNER không xoá/ngừng được.** Đây là vai trò quản trị gốc duy nhất; khóa nó có thể khiến toàn hệ thống không còn người quản trị.
- **Vai trò hệ thống không xoá được (D98)**; ngừng vai trò hệ thống làm ở màn Sửa (trạng thái). **Chỉ Chủ hệ thống (OWNER phạm vi toàn hệ thống) xoá được vai trò.** Không ai tự xoá vai trò mình đang giữ. API trả 403 `IAM_ROLE_PROTECTED` / 409 `IAM_ROLE_HELD_BY_ACTOR`; UI khoá nút theo `canDelete` server tính **cho người đang xem**, tooltip theo `deleteBlockedReason` (`ROLE_DELETE_BLOCK_LABELS`), không tự suy luật.
- **Hộp xoá `components/role-delete-modal.tsx`** (RHF + yup, antd `Steps`), modal chỉ đóng khi xoá thành công:
  1. **Chuyển vai trò** — Select "Chuyển người đang giữ vai trò sang" (vai trò ACTIVE, bỏ vai trò đang xoá, nhãn "Tên (MÃ)", `toRoleFallbackOptions`, allowClear). "Chuyển & xoá" (bật khi đã chọn) gửi `fallbackRoleId`; "Không chuyển, tiếp tục" sang bước 2.
  2. **Xử lý tài khoản** — vai trò VẪN bị xoá; Radio cho tài khoản không còn vai trò nào khác: Ngừng hoạt động (mặc định) / Xoá tài khoản (đỏ, Alert lỗi). Tài khoản còn vai trò khác chỉ bị gỡ vai trò này. "Quay lại" / "Xoá vai trò" gửi `orphanAction`.
  - Vai trò chưa ai giữ (`activeAssignmentCount = 0`): bỏ qua hai bước, chỉ lý do + Xoá, không gửi `orphanAction` (nếu vừa có người được gán song song API trả 400 `IAM_ROLE_ORPHAN_ACTION_REQUIRED` thay vì âm thầm ngừng/xoá tài khoản).
  - Lý do bắt buộc ≥ 3 ký tự ở bước gửi. Câu hệ quả `describeRoleDeleteImpact`; toast `describeRoleDeleteResult` (chuyển sang X / ngừng N / xoá N tài khoản).
- "Xoá tài khoản" ở API = xoá logic như `deleteAdminStaffUser` (LOCKED + thu hồi phiên), không xoá cứng dòng `users`.
- API còn chặn xoá khiến không còn nhân viên ACTIVE nào nắm `iam.role.manage` toàn hệ thống (409 `IAM_ROLE_LAST_MANAGER`) — UI không biết trước, chỉ báo lỗi.
- Lỗi xoá hiện toast, map theo mã (`model/role-lifecycle.policy.ts`); 404, `IAM_ROLE_VERSION_CONFLICT`, `IAM_ROLE_PROTECTED`, `IAM_ROLE_HELD_BY_ACTOR`, `IAM_ROLE_FALLBACK_UNAVAILABLE` tải lại danh sách.
- **Mã vai trò không đổi sau khi tạo.** Ô mã bị khoá ở chế độ sửa.
- **Không cho tự nâng quyền.** Backend từ chối cấp quyền mà chính người thao tác không có; UI khoá sẵn các ô đó kèm tooltip. Quyền vai trò *đang có sẵn* được giữ lại trong tập cấp được, để người sửa không cần toàn quyền chỉ để đổi tên.
- **Chỉ phạm vi GLOBAL mới quản lý được vai trò.** Quản lý chi nhánh không tạo được vai trò.
- **Mọi lần ghi gửi `expectedVersion`.** Hai người cùng sửa thì người sau nhận 409.
- Đổi tập quyền làm tăng `permissionVersion` của mọi người đang giữ vai trò đó ⇒ phiên đang đăng nhập phải lấy token mới.

## Checklist khi sửa

- [ ] Thêm mã quyền mới ở BE phải thêm nhãn vào `PERMISSION_LABELS` (`constants/role.constants.ts`) — `PermissionDto` không có tên/mô tả; test `permission-tree.test.ts` kiểm mọi mã có nhãn đều gắn màn hình.
- [ ] Không bỏ `grantableCodes` khỏi `PermissionPicker` — đó là lớp UI của quy tắc chống leo thang đặc quyền.
- [ ] Không thêm ô cho phép sửa `code`.
- [ ] Thêm/sửa mục menu chỉ ở `NAVIGATION_ITEMS_DATA`; không tạo danh sách menu thứ hai trong feature này.
- [ ] Họ quyền mới thuộc một màn có sẵn phải khai `FAMILY_TO_SCREEN_PERMISSION` (họ con gộp qua `FAMILY_ALIASES`), nếu không rơi vào "Quyền hệ thống khác" (chỉ dành cho quyền thật sự không có màn, vd. `system.module.view`).

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.6.0 | 2026-10-17 | Xoá vai trò chỉ Chủ hệ thống; `RoleDeleteModal` hai bước (`fallbackRoleId` bất kỳ vai trò ACTIVE / `orphanAction` DEACTIVATE·DELETE_ACCOUNT); tooltip theo `deleteBlockedReason`; lỗi `IAM_ROLE_HELD_BY_ACTOR`/`LAST_MANAGER`/`FALLBACK_INVALID`/`ORPHAN_ACTION_REQUIRED`. |
| 1.5.0 | 2026-10-17 | Bảng gọn + drawer chi tiết quyền theo màn hình; nhãn tiếng Việt cho mã quyền; nhóm "Quyền hệ thống khác" thay "Chưa có màn hình"; cờ Nhạy cảm có tooltip. |
| 1.4.0 | 2026-10-10 | Ô tìm vai trò (lọc tại chỗ, `q` trên URL); xoá vai trò dùng `useConfirmWithReason`; lỗi tải dùng `QueryErrorAlert`; bỏ `permissionLabel`/`permissionModuleLabels` không dùng. |
| 1.0.0 | 2026-09-14 | Tạo màn hình quản lý vai trò. |
| 1.0.1 | 2026-09-18 | Cho phép thu gọn cây quyền và ghi rõ cách nhóm theo màn hình. |
| 1.1.0 | 2026-09-19 | Thêm lifecycle an toàn cho vai trò hệ thống, xác nhận theo hậu quả và cây quyền mở rộng trong bảng. |
| 1.3.0 | 2026-10-03 | Xoá vai trò theo API D98: `canDelete`, `activeAssignmentCount` trong xác nhận, toast `affectedUsers`, lỗi `IAM_ROLE_*`. |
| 1.2.0 | 2026-10-02 | Thêm tab "Menu hiển thị" và xem trước menu theo vai trò (suy ra từ quyền, không có màn menu); gắn họ quyền nhập hàng/NCC và `catalog.review.reply` vào màn có sẵn. |
