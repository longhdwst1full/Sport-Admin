/**
 * Đọc một giá trị enum từ chuỗi không tin cậy (URL, storage). So với tập giá trị của enum chứ không
 * dùng `in`, để key có sẵn của object như `"toString"` không lọt qua.
 */
export function parseEnum<T extends string>(
  values: Record<string, T> | readonly T[],
  value: string | null | undefined,
): T | undefined {
  const allowed: readonly string[] = Array.isArray(values) ? values : Object.values(values);
  return value && allowed.includes(value) ? (value as T) : undefined;
}
