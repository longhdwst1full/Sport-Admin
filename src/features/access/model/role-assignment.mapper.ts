import {
  AssignUserRoleDtoScopeType,
  type AssignableStaffRoleCode,
  type AssignUserRoleDto,
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
