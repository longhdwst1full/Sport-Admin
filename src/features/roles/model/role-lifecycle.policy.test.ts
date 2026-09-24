import { describe, expect, it } from 'vitest';
import { canEditRolePermissions, getRoleRemovalMode } from './role-lifecycle.policy';
import { ROOT_ROLE_CODE } from '../constants/role.constants';

describe('getRoleRemovalMode', () => {
  it('chặn OWNER để tránh mất quản trị gốc', () => {
    expect(getRoleRemovalMode({ code: 'OWNER', system: true, status: 'ACTIVE' })).toBe('BLOCKED');
  });

  it('ngừng dùng role hệ thống đang hoạt động thay vì xóa vật lý', () => {
    expect(getRoleRemovalMode({ code: 'STAFF', system: true, status: 'ACTIVE' })).toBe(
      'DEACTIVATE',
    );
  });

  it('không lặp lại thao tác ngừng trên role đã inactive', () => {
    expect(getRoleRemovalMode({ code: 'STAFF', system: true, status: 'INACTIVE' })).toBe(
      'BLOCKED',
    );
  });

  it('cho phép gửi lệnh xóa đối với role tự tạo', () => {
    expect(getRoleRemovalMode({ code: 'WAREHOUSE_LEAD', system: false, status: 'ACTIVE' })).toBe(
      'DELETE',
    );
  });
});

describe('canEditRolePermissions', () => {
  /** Backend từ chối đổi tập quyền OWNER; form khoá sẵn để không tạo thao tác chắc chắn hỏng. */
  it('khoá tập quyền của OWNER', () => {
    expect(canEditRolePermissions({ code: ROOT_ROLE_CODE })).toBe(false);
  });

  it('vai trò khác vẫn sửa được quyền', () => {
    expect(canEditRolePermissions({ code: 'BRANCH_MANAGER' })).toBe(true);
    expect(canEditRolePermissions({ code: 'WAREHOUSE_LEAD' })).toBe(true);
  });

  /** Màn tạo mới chưa có role nào: phải cho sửa, không được khoá nhầm. */
  it('tạo vai trò mới thì không khoá', () => {
    expect(canEditRolePermissions(undefined)).toBe(true);
  });
});
