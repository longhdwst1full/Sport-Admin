# Access — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note khi feature chuẩn hoá về khuôn `pages/components/model`.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Tạo/khoá/mở khoá/xoá nhân sự Admin; gán và thu hồi role | Đăng nhập, đổi mật khẩu — thuộc `features/auth` |
| Map form ↔ DTO trong `model/*.mapper.ts` | Định nghĩa permission — thuộc backend IAM |

## Ranh giới

- `pages/access-page.tsx` sở hữu tab/search/paging.
- `components/staff-creation-drawer.tsx`, `role-assignment-drawer.tsx` sở hữu form; `*-modal.tsx` sở hữu xác nhận hành động huỷ/khoá.
- `model/staff-creation.mapper.ts`, `role-assignment.mapper.ts` là nơi duy nhất đọc tên field của DTO, có unit test đi kèm.

## Generated operation

`useListAdminUsers`, `useCreateAdminStaffUser`, `useDeleteAdminStaffUser`, `useLockAdminStaffUser`, `useUnlockAdminStaffUser`, `useListAdminRoles`, `useListAdminPermissions`, `useAssignAdminUserRole`, `useRevokeAdminUserRoleAssignment`, `useSearchActiveAdminBranches` — tất cả từ `src/generated/api/iam` và `organization`.

## Quyền

`useCan` chỉ cải thiện UX. Backend vẫn là nơi quyết định cuối cùng qua `@RequirePermissions` và branch scope (`04-permissions-transitions.md`).

## Checklist khi sửa

- [ ] Hành động huỷ/khoá phải có xác nhận và lý do; không thao tác ngầm.
- [ ] Không tự chế danh sách permission ở FE — luôn đọc từ `useListAdminPermissions`.
- [ ] Đổi field form phải sửa mapper + test, không ép kiểu `as any`.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note cùng đợt chuẩn hoá anatomy. |
