import {
  AssignUserRoleDtoScopeType,
  AssignableStaffRoleCode,
  type AssignUserRoleDto,
  type UserRoleAssignmentDto,
} from '@/generated/api/iam/iam.schemas';

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
    (Object.values(AssignableStaffRoleCode) as string[]).includes(assignment.roleCode) &&
    assignment.scopeType === AssignUserRoleDtoScopeType.BRANCH &&
    Boolean(assignment.branchId)
  );
}

/** Đưa assignment hiện có về giá trị form để sửa. */
export function toAssignmentFormValues(assignment: UserRoleAssignmentDto): AssignmentFormValues {
  return {
    roleCode: assignment.roleCode as AssignableStaffRoleCode,
    branchId: assignment.branchId ?? '',
  };
}
