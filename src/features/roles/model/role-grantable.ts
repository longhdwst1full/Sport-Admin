import type { PermissionDto, RoleDto } from '@/generated/api/iam/iam.schemas';

/**
 * API chặn cấp quyền vượt quá quyền của chính người thao tác. Khi sửa một vai trò,
 * quyền vai trò đã có vẫn giữ được, nên cộng vào tập cấp được để không buộc
 * người sửa phải có toàn quyền mới đổi được tên.
 */
export function grantableRoleCodes(
  permissions: readonly PermissionDto[],
  actorPermissions: ReadonlySet<string>,
  editing?: Pick<RoleDto, 'permissionCodes'>,
): Set<string> {
  const codes = new Set(permissions.filter(({ code }) => actorPermissions.has(code)).map(({ code }) => code));
  for (const code of editing?.permissionCodes ?? []) codes.add(code);
  return codes;
}
