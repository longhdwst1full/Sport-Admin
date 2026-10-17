import { describe, expect, it } from 'vitest';
import { toCreateVariantDto, toUpdateVariantDto, toVariantEditValues } from './variant-edit.mapper';

describe('variant edit mapping', () => {
  it('keeps SKU and barcode outside the mutable payload and normalizes empty optional fields', () => {
    const values = toVariantEditValues({
      id: 'variant-1',
      sku: 'IMMUTABLE-SKU',
      name: 'Size M',
      barcode: '2000000000015',
      weightGrams: 0,
      status: 'ACTIVE',
      version: 3,
    });

    expect(values).not.toHaveProperty('barcode');
    expect(toUpdateVariantDto({ ...values, name: ' Size L ' }, 3)).toEqual({
      name: 'Size L',
      weightGrams: 0,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      expectedVersion: 3,
    });
  });

  it('never sends SKU or barcode in the add-variant payload so the API generates them', () => {
    expect(toCreateVariantDto({ name: ' Size L ', lengthMm: 300 })).toEqual({
      name: 'Size L',
      weightGrams: 0,
      lengthMm: 300,
    });
  });
});
