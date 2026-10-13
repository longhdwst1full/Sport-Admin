import { describe, expect, it } from 'vitest';
import { toCreateVariantDto, toUpdateVariantDto, toVariantEditValues } from './variant-edit.mapper';

describe('variant edit mapping', () => {
  it('keeps SKU outside the mutable payload and normalizes empty optional fields', () => {
    const values = toVariantEditValues({
      id: 'variant-1',
      sku: 'IMMUTABLE-SKU',
      name: 'Size M',
      weightGrams: 0,
      status: 'ACTIVE',
      version: 3,
    });

    expect(toUpdateVariantDto({ ...values, name: ' Size L ', barcode: '' }, 3)).toEqual({
      name: 'Size L',
      barcode: null,
      weightGrams: 0,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      expectedVersion: 3,
    });
  });

  it('drops blank optional fields from the add-variant payload and upper-cases a manual SKU', () => {
    expect(toCreateVariantDto({ name: ' Size L ', sku: ' td-02 ', barcode: '  ', lengthMm: 300 })).toEqual({
      name: 'Size L',
      sku: 'TD-02',
      weightGrams: 0,
      lengthMm: 300,
    });
  });
});
