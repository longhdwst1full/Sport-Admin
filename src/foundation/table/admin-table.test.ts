import { describe, expect, it } from 'vitest';
import type { ColumnsType } from 'antd/es/table';
import { withFixedColumnWidths } from './table-config';

interface DemoRow {
  id: string;
  name: string;
}

describe('withFixedColumnWidths', () => {
  it('preserves explicit widths and fills missing widths recursively', () => {
    const columns: ColumnsType<DemoRow> = [
      { key: 'id', dataIndex: 'id', width: 90 },
      { key: 'name', dataIndex: 'name' },
      { key: 'group', title: 'Nhóm', children: [{ key: 'nested', dataIndex: 'name' }] },
    ];

    const result = withFixedColumnWidths(columns, 180);

    expect(result?.[0]?.width).toBe(90);
    expect(result?.[1]?.width).toBe(180);
    expect(result?.[2] && 'children' in result[2] ? result[2].children?.[0]?.width : null).toBe(180);
  });
});
