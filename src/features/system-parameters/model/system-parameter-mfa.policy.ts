import type { SystemParameterDto } from '@/generated/api/system/system.schemas';

/** Tham số không bí mật nhưng vẫn cần mã 2FA khi sửa: tắt nó là hạ chuẩn đăng nhập của toàn Admin. */
export const MFA_PROTECTED_PARAMETER_CODES: readonly string[] = ['ADMIN_MFA_ENFORCED'];

/**
 * Sửa/ngừng tham số này có cần header `x-mfa-code` không (khớp mô tả contract của
 * `updateAdminSystemParameter`). Chỉ quyết định có hỏi mã hay không; API vẫn là nơi chặn.
 */
export function requiresMfaCode(parameter: Pick<SystemParameterDto, 'code' | 'isSecret'>): boolean {
  return parameter.isSecret || MFA_PROTECTED_PARAMETER_CODES.includes(parameter.code);
}
