import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import {
  canEditRolePermissions,
  describeRoleDeleteImpact,
  describeRoleDeleteResult,
  getRoleDeleteState,
  roleDeleteErrorMessage,
  shouldReloadAfterRoleDeleteError,
} from './role-lifecycle.policy';
import { ROLE_DELETE_ERROR_CODE, ROOT_ROLE_CODE } from '../constants/role.constants';

const apiError = (statusCode: number, code: string) =>
  new ApiError(statusCode, { statusCode, code, message: 'server message' });

describe('getRoleDeleteState (D98)', () => {
  it('bật nút Xoá theo canDelete do server tính', () => {
    expect(
      getRoleDeleteState({ name: 'Trưởng ca', system: false, status: 'ACTIVE', canDelete: true }),
    ).toEqual({ allowed: true, label: 'Xoá vai trò Trưởng ca' });
  });

  it('khoá vai trò hệ thống, kể cả OWNER', () => {
    for (const name of ['Chủ cửa hàng', 'Quản lý chi nhánh', 'Nhân viên']) {
      const state = getRoleDeleteState({ name, system: true, status: 'ACTIVE', canDelete: false });
      expect(state.allowed).toBe(false);
      expect(state.label).toContain('hệ thống');
    }
  });

  it('khoá vai trò tự tạo mang quyền quản trị', () => {
    const state = getRoleDeleteState({ name: 'Bảo mật', system: false, status: 'ACTIVE', canDelete: false });
    expect(state).toEqual({ allowed: false, label: 'Vai trò mang quyền quản trị không được xoá' });
  });

  it('khoá vai trò đã ngừng và hết người giữ', () => {
    const state = getRoleDeleteState({ name: 'Cũ', system: false, status: 'INACTIVE', canDelete: false });
    expect(state.allowed).toBe(false);
  });

  /** Server là nơi quyết định: client không tự mở nút cho vai trò server đã khoá. */
  it('không tự mở khoá khi canDelete=false dù không phải vai trò hệ thống', () => {
    expect(
      getRoleDeleteState({ name: 'X', system: false, status: 'ACTIVE', canDelete: false }).allowed,
    ).toBe(false);
  });
});

describe('describeRoleDeleteImpact / describeRoleDeleteResult', () => {
  it('nêu số phân quyền sẽ chuyển về Nhân viên', () => {
    expect(describeRoleDeleteImpact({ activeAssignmentCount: 3 })).toContain(
      '3 phân quyền đang hoạt động sẽ được chuyển về vai trò Nhân viên',
    );
  });

  it('vai trò chưa gán thì không nhắc chuyển', () => {
    expect(describeRoleDeleteImpact({ activeAssignmentCount: 0 })).not.toContain('chuyển');
  });

  it('toast đếm theo số nhân viên bị ảnh hưởng', () => {
    expect(describeRoleDeleteResult({ affectedUsers: 2 })).toBe(
      'Đã chuyển 2 nhân viên về vai trò Nhân viên',
    );
    expect(describeRoleDeleteResult({ affectedUsers: 0 })).toBe('Đã xoá vai trò');
  });
});

describe('roleDeleteErrorMessage / shouldReloadAfterRoleDeleteError', () => {
  it('map mã lỗi ổn định sang tiếng Việt', () => {
    expect(roleDeleteErrorMessage(apiError(403, ROLE_DELETE_ERROR_CODE.PROTECTED), 'fallback')).toBe(
      'Vai trò quản trị hoặc vai trò hệ thống không được xoá.',
    );
    expect(
      roleDeleteErrorMessage(apiError(409, ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE), 'fallback'),
    ).toContain('Vai trò Nhân viên đang ngừng hoạt động');
  });

  it('mã lạ dùng thông báo server', () => {
    expect(roleDeleteErrorMessage(apiError(400, 'VALIDATION_ERROR'), 'server message')).toBe(
      'server message',
    );
  });

  it('tải lại danh sách khi version lệch, role đã bị xoá hoặc vừa thành vai trò được bảo vệ', () => {
    expect(shouldReloadAfterRoleDeleteError(apiError(409, ROLE_DELETE_ERROR_CODE.VERSION_CONFLICT))).toBe(true);
    expect(shouldReloadAfterRoleDeleteError(apiError(404, 'NOT_FOUND'))).toBe(true);
    expect(shouldReloadAfterRoleDeleteError(apiError(403, ROLE_DELETE_ERROR_CODE.PROTECTED))).toBe(true);
    expect(shouldReloadAfterRoleDeleteError(apiError(409, ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE))).toBe(false);
    expect(shouldReloadAfterRoleDeleteError(new Error('network'))).toBe(false);
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
