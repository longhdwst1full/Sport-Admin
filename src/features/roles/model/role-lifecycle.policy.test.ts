import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/fetcher';
import {
  canEditRolePermissions,
  describeRoleDeleteImpact,
  describeRoleDeleteResult,
  getRoleDeleteState,
  toDeleteRolePayload,
  toRoleFallbackOptions,
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

  it('người xem không phải Chủ hệ thống', () => {
    const state = getRoleDeleteState({
      name: 'Bảo mật', system: false, status: 'ACTIVE', canDelete: false, deleteBlockedReason: 'OWNER_ONLY',
    });
    expect(state).toEqual({ allowed: false, label: 'Chỉ Chủ hệ thống được xoá vai trò' });
  });

  it('khoá vai trò người đang xem đang giữ', () => {
    const state = getRoleDeleteState({
      name: 'Trưởng ca', system: false, status: 'ACTIVE', canDelete: false, deleteBlockedReason: 'HELD_BY_ACTOR',
    });
    expect(state).toEqual({ allowed: false, label: 'Bạn đang giữ vai trò này nên không thể tự xoá' });
  });

  it('lý do server trả được ưu tiên hơn suy luận cục bộ', () => {
    const state = getRoleDeleteState({
      name: 'Nhân viên', system: true, status: 'ACTIVE', canDelete: false, deleteBlockedReason: 'SYSTEM_ROLE',
    });
    expect(state.label).toBe('Vai trò hệ thống không được xoá; dùng Sửa để ngừng hoạt động');
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

describe('toRoleFallbackOptions / toDeleteRolePayload', () => {
  const roles = [
    { id: '1', name: 'Chủ cửa hàng', code: 'OWNER', status: 'ACTIVE' as const },
    { id: '3', name: 'Nhân viên', code: 'STAFF', status: 'ACTIVE' as const },
    { id: '9', name: 'Cũ', code: 'OLD', status: 'INACTIVE' as const },
    { id: '50', name: 'Trưởng ca', code: 'SHIFT_LEAD', status: 'ACTIVE' as const },
  ];

  it('chỉ liệt kê vai trò đang hoạt động, bỏ vai trò đang xoá, nhãn "Tên (MÃ)"', () => {
    expect(toRoleFallbackOptions(roles, '50')).toEqual([
      { value: '1', label: 'Chủ cửa hàng (OWNER)' },
      { value: '3', label: 'Nhân viên (STAFF)' },
    ]);
  });

  it('có vai trò chuyển sang thì chỉ gửi fallbackRoleId (bỏ orphanAction), lý do đã trim', () => {
    expect(
      toDeleteRolePayload({ activeAssignmentCount: 2 }, { fallbackRoleId: '3', orphanAction: 'DELETE_ACCOUNT', reason: '  gộp  ' }),
    ).toEqual({ reason: 'gộp', fallbackRoleId: '3' });
  });

  it('không chuyển thì gửi orphanAction khi còn người giữ', () => {
    expect(
      toDeleteRolePayload({ activeAssignmentCount: 2 }, { fallbackRoleId: null, orphanAction: 'DELETE_ACCOUNT', reason: 'gộp' }),
    ).toEqual({ reason: 'gộp', orphanAction: 'DELETE_ACCOUNT' });
  });

  /** Vai trò chưa ai giữ: không gửi orphanAction để API báo lỗi nếu vừa có người được gán song song. */
  it('vai trò chưa ai giữ chỉ gửi lý do', () => {
    expect(
      toDeleteRolePayload({ activeAssignmentCount: 0 }, { fallbackRoleId: null, orphanAction: 'DEACTIVATE', reason: 'gộp' }),
    ).toEqual({ reason: 'gộp' });
  });
});

describe('describeRoleDeleteImpact / describeRoleDeleteResult', () => {
  it('chuyển sang vai trò đã chọn', () => {
    expect(describeRoleDeleteImpact({ activeAssignmentCount: 3 }, { kind: 'move', roleLabel: 'Nhân viên (STAFF)' })).toContain(
      'Vai trò sẽ bị xoá. 3 phân quyền đang hoạt động sẽ được chuyển sang vai trò Nhân viên (STAFF)',
    );
  });

  it('không chuyển: vai trò vẫn bị xoá; nêu rõ ngừng hoạt động hay xoá tài khoản mồ côi', () => {
    const deactivate = describeRoleDeleteImpact({ activeAssignmentCount: 1 }, { kind: 'orphan', orphanAction: 'DEACTIVATE' });
    expect(deactivate).toContain('Vai trò sẽ bị xoá');
    expect(deactivate).toContain('Tài khoản còn vai trò khác chỉ bị gỡ vai trò này');
    expect(deactivate).toContain('chuyển sang Ngừng hoạt động');
    const remove = describeRoleDeleteImpact({ activeAssignmentCount: 1 }, { kind: 'orphan', orphanAction: 'DELETE_ACCOUNT' });
    expect(remove).toContain('bị XOÁ');
  });

  it('vai trò chưa gán thì không nhắc chuyển', () => {
    expect(describeRoleDeleteImpact({ activeAssignmentCount: 0 }, { kind: 'orphan', orphanAction: 'DEACTIVATE' })).not.toContain('chuyển');
  });

  it('toast theo kết quả', () => {
    const base = { movedAssignments: 0, deactivatedUsers: 0, deletedUsers: 0 };
    expect(describeRoleDeleteResult({ ...base, affectedUsers: 2, movedAssignments: 3 }, 'Nhân viên (STAFF)')).toBe(
      'Đã xoá vai trò và chuyển 2 nhân viên sang vai trò Nhân viên (STAFF)',
    );
    expect(describeRoleDeleteResult({ ...base, affectedUsers: 3, deactivatedUsers: 2 })).toBe(
      'Đã xoá vai trò, gỡ vai trò khỏi 3 nhân viên, ngừng hoạt động 2 tài khoản',
    );
    expect(describeRoleDeleteResult({ ...base, affectedUsers: 1, deletedUsers: 1 })).toBe(
      'Đã xoá vai trò, gỡ vai trò khỏi 1 nhân viên, xoá 1 tài khoản',
    );
    expect(describeRoleDeleteResult({ ...base, affectedUsers: 0 })).toBe('Đã xoá vai trò');
  });
});

describe('roleDeleteErrorMessage / shouldReloadAfterRoleDeleteError', () => {
  it('map mã lỗi ổn định sang tiếng Việt', () => {
    expect(roleDeleteErrorMessage(apiError(403, ROLE_DELETE_ERROR_CODE.PROTECTED), 'fallback')).toContain(
      'chỉ Chủ hệ thống được xoá',
    );
    expect(roleDeleteErrorMessage(apiError(400, ROLE_DELETE_ERROR_CODE.ORPHAN_ACTION_REQUIRED), 'fallback')).toContain(
      'Ngừng hoạt động hoặc Xoá tài khoản',
    );
    expect(roleDeleteErrorMessage(apiError(400, ROLE_DELETE_ERROR_CODE.FALLBACK_INVALID), 'fallback')).toBe(
      'Vai trò chuyển sang phải khác vai trò đang xoá.',
    );
    expect(
      roleDeleteErrorMessage(apiError(409, ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE), 'fallback'),
    ).toContain('Hãy chọn vai trò khác');
    expect(roleDeleteErrorMessage(apiError(409, ROLE_DELETE_ERROR_CODE.HELD_BY_ACTOR), 'fallback')).toContain(
      'Bạn đang giữ vai trò này',
    );
    expect(roleDeleteErrorMessage(apiError(409, ROLE_DELETE_ERROR_CODE.LAST_MANAGER), 'fallback')).toContain(
      'không còn ai quản lý được vai trò',
    );
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
    expect(shouldReloadAfterRoleDeleteError(apiError(409, ROLE_DELETE_ERROR_CODE.HELD_BY_ACTOR))).toBe(true);
    expect(shouldReloadAfterRoleDeleteError(apiError(409, ROLE_DELETE_ERROR_CODE.FALLBACK_UNAVAILABLE))).toBe(true);
    expect(shouldReloadAfterRoleDeleteError(apiError(400, ROLE_DELETE_ERROR_CODE.ORPHAN_ACTION_REQUIRED))).toBe(false);
    expect(shouldReloadAfterRoleDeleteError(apiError(409, ROLE_DELETE_ERROR_CODE.LAST_MANAGER))).toBe(false);
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
