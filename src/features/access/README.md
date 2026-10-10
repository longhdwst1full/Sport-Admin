# Access — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-10-10
>
> **Change summary:** Tách drawer tạo nhân viên/phân quyền thành hook + component; modal khoá/xoá/thu hồi dùng `FormModal`; tab nằm trên URL.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Tạo/khoá/mở khoá/xoá nhân sự Admin; gán và thu hồi role | Đăng nhập, đổi mật khẩu — thuộc `features/auth` |
| Map form ↔ DTO trong `model/*.mapper.ts` | Định nghĩa permission — thuộc backend IAM |

## Ranh giới

- `pages/access-page.tsx` sở hữu tab (`?tab=roles`, trên URL). `listAdminUsers` không phân trang nên bảng hiện toàn bộ.
- `hooks/use-staff-creation-form.ts`, `hooks/use-role-assignment-editor.ts` sở hữu form + luồng gửi; `components/staff-creation-drawer.tsx`, `role-assignment-drawer.tsx` chỉ còn bố cục, ghép `AssignableRoleCards` (dùng chung), `ExtraAssignmentRows`, `StaffPermissionMatrix`, `CurrentAssignmentList`.
- `*-modal.tsx` (khoá/mở khoá/xoá, thu hồi) dùng `FormModal`: hỏi lại khi đóng lúc đã nhập lý do; lý do được xoá trên đường đóng (không dùng effect).
- `model/staff-creation.mapper.ts`, `role-assignment.mapper.ts` là nơi duy nhất đọc tên field của DTO, có unit test đi kèm.
- `constants/access.constants.ts` chỉ giữ nhãn trình bày (vai trò, phạm vi, trạng thái, nhóm quyền). Tên vai trò và số quyền luôn đọc từ `listAdminRoles`, không có danh sách vai trò fallback.
- Ô chọn chi nhánh ACTIVE dùng `BranchSelect` của `@/features/organization` (`labelFormat="code-name"`); call site tự chuyển xoá chọn thành `''` cho form.

## Luồng phân quyền (không có API nguyên tử mới)

| Thao tác | Gọi API | Ghi chú |
| --- | --- | --- |
| Tạo nhân viên nhiều phạm vi | `createAdminStaffUser` (dòng chính) rồi `assignAdminUserRole` tuần tự cho từng dòng bổ sung | Trùng vai trò + chi nhánh bị chặn ở client trước khi tạo. Dòng gán lỗi được báo lại (tài khoản vẫn đã tạo) để gán lại trong drawer phân quyền. |
| Thêm vai trò cho nhân viên có sẵn | `assignAdminUserRole` | Drawer ở lại mở, danh sách assignment làm mới từ `listAdminUsers`. |
| Sửa vai trò/chi nhánh | `assignAdminUserRole` (mới) **rồi** `revokeAdminUserRoleAssignment` (cũ, kèm lý do) | Gán trước để lỗi gán không làm mất quyền đang có. Nếu thu hồi lỗi, cảnh báo rõ assignment cũ vẫn hiệu lực. Không nguyên tử: giữa hai lệnh nhân viên tạm có cả hai assignment. |
| Thu hồi | `revokeAdminUserRoleAssignment` qua `RoleAssignmentRevokeModal` (bắt buộc lý do) | Chỉ assignment BRANCH của BRANCH_MANAGER/STAFF; OWNER không sửa/thu hồi (D35/D42). |

`AccessPage` giữ `assignmentUserId` và suy `UserDto` từ query, nên drawer luôn hiển thị assignment mới nhất.

## Generated operation

`useListAdminUsers`, `useCreateAdminStaffUser`, `useDeleteAdminStaffUser`, `useLockAdminStaffUser`, `useUnlockAdminStaffUser`, `useListAdminRoles`, `useListAdminPermissions`, `useAssignAdminUserRole`, `useRevokeAdminUserRoleAssignment`, `useSearchActiveAdminBranches`/`searchActiveAdminBranches`, `useListAdminBranches` (nhãn chi nhánh của assignment, chỉ khi có `org.branch.view`) — tất cả từ `src/generated/api/iam` và `organization`.

## Quyền

`useCan` chỉ cải thiện UX. Cảnh báo "Môi trường phát triển đang bỏ qua kiểm tra quyền" chỉ hiện khi `useAuth().developmentBypass` bật thật. Backend vẫn là nơi quyết định cuối cùng qua `@RequirePermissions` và branch scope (`04-permissions-transitions.md`).

## Checklist khi sửa

- [ ] Hành động huỷ/khoá phải có xác nhận và lý do; không thao tác ngầm.
- [ ] Không tự chế danh sách permission ở FE — luôn đọc từ `useListAdminPermissions`.
- [ ] Đổi field form phải sửa mapper + test, không ép kiểu `as any`.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note cùng đợt chuẩn hoá anatomy. |
| 1.2.0 | 2026-10-10 | Tách hook/component cho hai drawer; `FormModal` cho modal có lý do; trạng thái theo `StatusTone`; nhãn vai trò/phạm vi tiếng Việt thay mã enum; tab trên URL. |
| 1.1.0 | 2026-10-02 | Thêm/sửa/thu hồi vai trò + chi nhánh (tạo nhân viên nhiều phạm vi, drawer phân quyền); bỏ vai trò fallback giả và số quyền cứng 32/18; cảnh báo bypass chỉ hiện khi bypass bật. |
