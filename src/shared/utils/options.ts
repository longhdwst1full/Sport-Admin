export interface SelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

/**
 * Tạo options cho Select từ map nhãn/presentation của một enum. Gọi ở mức module (hằng số), không
 * gọi trong render (RULE-DT-05).
 *
 * `toOptions({ A: 'Nhãn A' })` hoặc `toOptions({ A: { label: 'Nhãn A', color } })`.
 */
export function toOptions<TValue extends string>(
  labels: Record<TValue, string | { label: string }>,
): SelectOption<TValue>[] {
  return (Object.entries(labels) as [TValue, string | { label: string }][]).map(([value, entry]) => ({
    value,
    label: typeof entry === 'string' ? entry : entry.label,
  }));
}
