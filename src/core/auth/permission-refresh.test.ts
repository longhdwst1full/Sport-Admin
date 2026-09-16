import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PERMISSION_CHANGING_OPERATIONS } from './auth-context';

/**
 * Đổi vai trò hoặc phân quyền làm `permissionVersion` ở Backend tăng lên. Nếu Admin không
 * đọc lại `/auth/me`, menu và các nút vẫn dựng theo quyền cũ cho tới khi người dùng tự tải
 * lại trang.
 */
describe('Làm mới quyền sau khi thay đổi phân quyền', () => {
  /**
   * Chặn hồi quy: thêm thao tác quyền mới ở Backend mà quên khai ở đây thì người đang đăng
   * nhập giữ nguyên menu cũ — lỗi âm thầm, không ai thấy cho tới khi có người báo.
   */
  it('phủ hết các thao tác quyền mà SDK sinh ra', () => {
    const sdk = readFileSync(
      join(__dirname, '..', '..', 'generated', 'api', 'iam', 'iam.ts'),
      'utf8',
    );
    const generated = new Set(
      Array.from(sdk.matchAll(/const mutationKey = \['(\w+)'\]/g), (match) => match[1]),
    );

    // Tạo nhân viên mới không đổi quyền của chính người đang thao tác.
    const notAffectingSelf = new Set(['createAdminStaffUser']);
    const missing = [...generated].filter(
      (operation) =>
        !PERMISSION_CHANGING_OPERATIONS.has(operation) && !notAffectingSelf.has(operation),
    );

    expect(missing).toEqual([]);
  });

  it('không khai thao tác không tồn tại trong SDK', () => {
    const sdk = readFileSync(
      join(__dirname, '..', '..', 'generated', 'api', 'iam', 'iam.ts'),
      'utf8',
    );
    const generated = new Set(
      Array.from(sdk.matchAll(/const mutationKey = \['(\w+)'\]/g), (match) => match[1]),
    );

    const stale = [...PERMISSION_CHANGING_OPERATIONS].filter((op) => !generated.has(op));
    expect(stale).toEqual([]);
  });
});
