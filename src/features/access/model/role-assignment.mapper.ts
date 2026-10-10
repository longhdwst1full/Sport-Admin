import {
  AssignUserRoleDtoScopeType,
  AssignableStaffRoleCode,
  type AssignUserRoleDto,
  type RoleDto,
  type UserRoleAssignmentDto,
} from '@/generated/api/iam/iam.schemas';
import { parseEnum } from '@/shared/utils/parse-enum';

export interface AssignmentFormValues {
  roleCode: AssignableStaffRoleCode | '';
  branchId: string;
}

export function toAssignUserRoleDto(values: AssignmentFormValues): AssignUserRoleDto {
  return {
    roleCode: values.roleCode as AssignableStaffRoleCode,
    scopeType: AssignUserRoleDtoScopeType.BRANCH,
    branchId: values.branchId,
  };
}

/** Mã vai trò có thuộc nhóm cấp dưới gán được (BRANCH_MANAGER/STAFF) hay không. */
export function isAssignableRoleCode(code: string): code is AssignableStaffRoleCode {
  return parseEnum(AssignableStaffRoleCode, code) !== undefined;
}

/** Vai trò từ `listAdminRoles` đã thu hẹp về nhóm gán được. */
export type AssignableRole = RoleDto & { code: AssignableStaffRoleCode };

export function pickAssignableRoles(roles: readonly RoleDto[]): AssignableRole[] {
  return roles.filter((role): role is AssignableRole => isAssignableRoleCode(role.code));
}

/** Khoá nhận diện một assignment theo đúng ràng buộc unique phía server: vai trò + chi nhánh. */
export function assignmentIdentity(roleCode: string, branchId: string | undefined): string {
  return `${roleCode}@${branchId ?? ''}`;
}

/**
 * Chỉ assignment vai trò cấp dưới theo chi nhánh mới sửa/thu hồi được (D35/D42). OWNER và
 * assignment GLOBAL do bootstrap quản lý; backend vẫn từ chối nếu UI để lọt.
 */
export function isEditableAssignment(assignment: UserRoleAssignmentDto): boolean {
  return (
    isAssignableRoleCode(assignment.roleCode) &&
    assignment.scopeType === AssignUserRoleDtoScopeType.BRANCH &&
    Boolean(assignment.branchId)
  );
}

/** Đưa assignment hiện có về giá trị form để sửa. */
export function toAssignmentFormValues(assignment: UserRoleAssignmentDto): AssignmentFormValues {
  return {
    roleCode: isAssignableRoleCode(assignment.roleCode) ? assignment.roleCode : '',
    branchId: assignment.branchId ?? '',
  };
}
