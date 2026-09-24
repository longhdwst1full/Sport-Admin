import type { ReactNode } from 'react';
import type { TableColumnType } from 'antd';
import type { ReturnTableColumnConfig } from '../constants/return-table-columns';

/**
 * Ghép cấu hình cột (`constants/return-table-columns.ts`) với hàm render theo `id`. Cột không có render
 * riêng hiển thị thẳng field cùng tên (`dataIndex = id`).
 */
export function buildTableColumns<TRow, TId extends string>(
  configs: readonly ReturnTableColumnConfig<TId>[],
  renderers: Partial<Record<TId, (row: TRow, index: number) => ReactNode>>,
): TableColumnType<TRow>[] {
  return configs.map((config) => {
    const render = renderers[config.id];
    return {
      key: config.id,
      title: config.label,
      width: config.width,
      fixed: config.fixed,
      ...(render
        ? { render: (_: unknown, row: TRow, index: number) => render(row, index) }
        : { dataIndex: config.id as string }),
    };
  });
}
