import { describe, expect, it } from 'vitest';
import {
  AssignableStaffRoleCode,
  AssignUserRoleDtoScopeType,
} from '@/generated/api/iam/models';
import { toAssignUserRoleDto } from './role-assignment.mapper';

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
