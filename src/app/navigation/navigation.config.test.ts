import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAVIGATION_ITEMS } from './navigation.config';

/**
 * Menu ẩn không phải là kiểm soát truy cập: mọi mục hiện trong sidebar phải có một
 * <PermissionRoute> canh cùng quyền, nếu không người dùng vẫn vào được màn hình bằng URL
 * trực tiếp và chỉ bị chặn ở tầng API. Test này giữ hai nơi khai báo không trôi khỏi nhau.
 */
const routeSource = readFileSync(
  new URL('../router/app-routes.tsx', import.meta.url),
  'utf8',
);

const guardedPermissions = new Set(
  [...routeSource.matchAll(/<PermissionRoute permission="([^"]+)"/g)].map(([, code]) => code),
);

describe('navigation permission codes', () => {
  it('guards every navigable menu entry with a matching route permission', () => {
    const unguarded = NAVIGATION_ITEMS.filter(
      (item) => item.permission && !guardedPermissions.has(item.permission),
    ).map((item) => `${item.path} -> ${item.permission ?? ''}`);

    expect(unguarded).toEqual([]);
  });

  it('declares a permission for every entry so nothing is visible by default', () => {
    const open = NAVIGATION_ITEMS.filter((item) => !item.permission).map((item) => item.path);

    expect(open).toEqual([]);
  });

  it('uses the reviewed RBAC catalog codes, not the retired ad hoc ones', () => {
    const retired = ['content.post.view', 'content.post.manage', 'review.moderate'];
    const used = NAVIGATION_ITEMS.map((item) => item.permission);

    expect(used.filter((code) => code && retired.includes(code))).toEqual([]);
  });
});
