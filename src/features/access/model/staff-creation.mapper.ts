import type {
  AssignUserRoleDto,
  CreateStaffUserDto,
  CreateStaffUserDtoRoleCode,
} from '@/generated/api/iam/iam.schemas';
import { type AssignmentFormValues, toAssignUserRoleDto } from './role-assignment.mapper';

export interface StaffFormValues {
  displayName: string;
  email: string;
  roleCode: CreateStaffUserDtoRoleCode;
  branchId: string;
}

/**
 * Form tạo nhân viên: assignment chính đi cùng `createAdminStaffUser`, các dòng thêm được gán
 * tuần tự bằng `assignAdminUserRole` sau khi tài khoản đã tồn tại.
 */
export interface StaffCreationFormValues extends StaffFormValues {
  extraAssignments: AssignmentFormValues[];
}

export function toCreateStaffUserDto(values: StaffFormValues): CreateStaffUserDto {
  return {
    displayName: values.displayName.trim(),
    email: values.email.trim().toLowerCase(),
    roleCode: values.roleCode,
    branchId: values.branchId,
  };
}

export function toExtraAssignUserRoleDtos(values: StaffCreationFormValues): AssignUserRoleDto[] {
  return values.extraAssignments.map(toAssignUserRoleDto);
}
