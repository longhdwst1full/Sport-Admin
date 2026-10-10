import { describe, expect, it } from 'vitest';
import {
  AssignableStaffRoleCode,
  AssignUserRoleDtoScopeType,
  type RoleDto,
} from '@/generated/api/iam/iam.schemas';
import { pickAssignableRoles, toAssignUserRoleDto } from './role-assignment.mapper';

describe('toAssignUserRoleDto', () => {
  it('only sends the identifier owned by BRANCH scope', () => {
    expect(
      toAssignUserRoleDto({
        roleCode: AssignableStaffRoleCode.BRANCH_MANAGER,
        branchId: 'branch-1',
      }),
    ).toEqual({
      roleCode: AssignableStaffRoleCode.BRANCH_MANAGER,
      scopeType: AssignUserRoleDtoScopeType.BRANCH,
      branchId: 'branch-1',
    });
  });

  it('always maps subordinate assignments to BRANCH scope', () => {
    expect(
      toAssignUserRoleDto({
        roleCode: AssignableStaffRoleCode.STAFF,
        branchId: 'branch-2',
      }),
    ).toEqual({
      roleCode: AssignableStaffRoleCode.STAFF,
      scopeType: AssignUserRoleDtoScopeType.BRANCH,
      branchId: 'branch-2',
    });
  });
});

describe('pickAssignableRoles', () => {
  it('keeps only subordinate roles that can be assigned', () => {
    const role = (code: string): RoleDto => ({
      id: '1',
      code,
      name: code,
      status: 'ACTIVE',
      system: true,
      permissionCodes: [],
      version: 1,
      activeAssignmentCount: 0,
      canDelete: false,
    });
    expect(
      pickAssignableRoles([role('OWNER'), role('STAFF'), role('BRANCH_MANAGER')]).map((r) => r.code),
    ).toEqual(['STAFF', 'BRANCH_MANAGER']);
  });
});
