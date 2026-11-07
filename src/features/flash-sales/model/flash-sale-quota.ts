import type { EditableItem } from './flash-sale.mapper';

export function bulkQuotaError(items: readonly EditableItem[], quota: number | null): string | undefined {
  if (quota === null || !Number.isSafeInteger(quota) || quota < 1) return 'Nhập số suất nguyên lớn hơn 0';
  const minimum = Math.max(1, ...items.map((item) => item.committed));
  if (quota < minimum) return `Tối thiểu ${minimum} suất để không thấp hơn số đã bán/đang giữ của một SKU trong bảng`;
  return undefined;
}

/** Apply exactly the requested total quota to every SKU; never silently clamp or add to sold quantities. */
export function applyBulkQuota(items: EditableItem[], quota: number | null): EditableItem[] {
  if (bulkQuotaError(items, quota)) return items;
  return items.map((item) => ({ ...item, quota }));
}
