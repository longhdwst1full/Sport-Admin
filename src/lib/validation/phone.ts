import type { Rule } from 'antd/es/form';

/**
 * Số điện thoại Việt Nam: 0 hoặc +84/84 rồi 8–10 chữ số, sau khi bỏ dấu cách/chấm/gạch nối người dùng
 * hay gõ. Contract không khai báo pattern, nên đây chỉ là kiểm tra định dạng phía UI.
 */
const VN_PHONE_PATTERN = /^(?:\+?84|0)\d{8,10}$/;

/** Rỗng coi là hợp lệ: bắt buộc hay không do rule `required` riêng quyết định. */
export function isValidPhone(value?: string | null): boolean {
  const trimmed = value?.trim();
  return !trimmed || VN_PHONE_PATTERN.test(trimmed.replace(/[\s.-]/g, ''));
}

/** Rule antd Form dùng chung cho ô số điện thoại. */
export const PHONE_RULE: Rule = {
  validator: (_rule, value?: string) =>
    isValidPhone(value) ? Promise.resolve() : Promise.reject(new Error('Số điện thoại không hợp lệ')),
};
