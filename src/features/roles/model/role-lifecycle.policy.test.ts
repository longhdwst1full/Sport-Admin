import { describe, expect, it } from 'vitest';
import { getRoleRemovalMode } from './role-lifecycle.policy';

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
