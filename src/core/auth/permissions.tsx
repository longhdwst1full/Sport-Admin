/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './auth-context';

class PermissionSet extends Set<string> {
  constructor(
    permissions: Iterable<string>,
    private readonly allowAll: boolean,
  ) {
    super(permissions);
  }

  override has(permission: string): boolean {
    return this.allowAll || super.has(permission);
  }
}

export function shouldBypassPermissions(isDevelopment: boolean, flag?: string): boolean {
  return isDevelopment && (flag ?? 'true') === 'true';
}

export function createPermissionSet(
  rawPermissions: string,
  allowAll: boolean,
): ReadonlySet<string> {
  const permissions = rawPermissions
    .split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);
  return new PermissionSet(permissions, allowAll);
}

const PermissionContext = createContext<ReadonlySet<string>>(new Set());

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { currentUser, developmentBypass } = useAuth();
  const currentUserPermissions = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : [];
  const permissions = createPermissionSet(
    currentUserPermissions.length > 0
      ? currentUserPermissions.join(',')
      : import.meta.env.VITE_DEV_PERMISSIONS ?? '',
    developmentBypass,
  );
  return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>;
}

export function useCan(permission: string): boolean {
  return useContext(PermissionContext).has(permission);
}

/**
 * SECURITY: `PermissionGuard` phía backend dùng `required.every(...)`, nghĩa là endpoint khai báo
 * nhiều permission thì phải có ĐỦ. Hook này giữ đúng ngữ nghĩa AND đó để UI không mở thao tác mà
 * backend chắc chắn từ chối.
 */
export function useCanAll(permissions: readonly string[]): boolean {
  const granted = useContext(PermissionContext);
  return permissions.every((permission) => granted.has(permission));
}

export function usePermissions(): ReadonlySet<string> {
  return useContext(PermissionContext);
}

export function PermissionGate({
  permission,
  children,
}: {
  /** Một code, hoặc danh sách code phải có ĐỦ — khớp ngữ nghĩa AND của backend. */
  permission: string | readonly string[];
  children: ReactNode;
}) {
  const required = typeof permission === 'string' ? [permission] : permission;
  return useCanAll(required) ? children : null;
}
