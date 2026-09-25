import { describe, expect, it } from 'vitest';
import type { AttributeDto } from '@/generated/api/catalog/models';
import { toSpecificationPayload, toSpecificationRows } from './product-specifications';

const attribute = (overrides: Partial<AttributeDto>): AttributeDto => ({
  id: '1', code: 'MATERIAL', name: 'Chất liệu', dataType: 'TEXT', unit: null, isVariantAxis: false,
  options: [], status: 'ACTIVE', sortOrder: 0, version: 0, ...overrides,
});
const dictionary = [
  attribute({ code: 'MATERIAL' }),
  attribute({ code: 'HEIGHT', name: 'Chiều cao', dataType: 'NUMBER', unit: 'm' }),
  attribute({ code: 'CRANK', name: 'Tay quay', dataType: 'BOOLEAN' }),
  attribute({ code: 'COLOR', name: 'Màu', dataType: 'OPTION', options: [{ code: 'WHITE', label: 'Trắng' }] }),
];

describe('product specifications form mapping', () => {
  it('converts TD-02 rows to typed API values (decimal comma accepted)', () => {
    const result = toSpecificationPayload([
      { code: 'MATERIAL', values: ['Thép'] },
      { code: 'HEIGHT', values: ['1,55', '2.25'] },
      { code: 'CRANK', values: ['true'] },
      { code: 'COLOR', values: ['WHITE'] },
    ], dictionary);

    expect(result.errors).toEqual([]);
    expect(result.specifications).toEqual([
      { code: 'MATERIAL', values: ['Thép'] },
      { code: 'HEIGHT', values: [1.55, 2.25] },
      { code: 'CRANK', values: [true] },
      { code: 'COLOR', values: ['WHITE'] },
    ]);
  });

  it('reports row errors instead of sending bad data', () => {
    const result = toSpecificationPayload([
      { code: '', values: ['x'] },
      { code: 'HEIGHT', values: ['2.25m'] },
      { code: 'MATERIAL', values: [' '] },
      { code: 'MATERIAL', values: ['a'] },
      { code: 'MATERIAL', values: ['b'] },
    ], dictionary);

    expect(result.errors).toHaveLength(5);
    expect(result.errors[1]).toContain('đơn vị m');
  });

  it('turns resolved API values back into editable rows', () => {
    expect(toSpecificationRows([
      { code: 'HEIGHT', name: 'Chiều cao', dataType: 'NUMBER', unit: 'm', values: [{ value: 2.25, label: '2,25 m' }] },
    ])).toEqual([{ code: 'HEIGHT', values: ['2.25'] }]);
  });
});
