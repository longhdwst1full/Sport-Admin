import { describe, expect, it } from 'vitest';
import { buildTableColumns } from './build-table-columns';

describe('buildTableColumns', () => {
  it('keeps label, width and fixed from config and uses the field when no renderer exists', () => {
    const columns = buildTableColumns<{ code: string; name: string }, 'code' | 'name'>(
      [
        { id: 'code', label: 'Mã', width: 120, fixed: 'left' },
        { id: 'name', label: 'Tên' },
      ],
      { name: (row) => row.name.toUpperCase() },
    );
    expect(columns[0]).toEqual({ key: 'code', title: 'Mã', width: 120, fixed: 'left', dataIndex: 'code' });
    expect(columns[1].title).toBe('Tên');
    expect(columns[1].render?.(undefined, { code: 'A', name: 'áo' }, 0)).toBe('ÁO');
  });
});
