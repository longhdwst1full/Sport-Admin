import { describe, expect, it } from 'vitest';
import { chunkOpeningStock, parseOpeningStockCsv } from './opening-stock-import';

describe('opening stock CSV import', () => {
  it('reads an Excel CSV with BOM, header and semicolon delimiter', () => {
    const result = parseOpeningStockCsv('﻿sku;so_luong\r\ntd-02;10\r\n"V-40+";1.200\r\n\r\n');

    expect(result.errors).toEqual([]);
    expect(result.lines).toEqual([
      { row: 2, sku: 'TD-02', quantity: 10 },
      { row: 3, sku: 'V-40+', quantity: 1200 },
    ]);
  });

  it('reports invalid quantities and duplicate SKUs with their file row instead of summing', () => {
    const result = parseOpeningStockCsv('TD-02,5\nGTBDNXK,0\n,3\nTD-02,2\nSDQD,abc');

    expect(result.lines).toEqual([{ row: 1, sku: 'TD-02', quantity: 5 }]);
    expect(result.errors.map(({ row }) => row)).toEqual([2, 3, 4, 5]);
    expect(result.errors[2].message).toContain('trùng với dòng 1');
  });

  it('splits lines into fixed-size chunks', () => {
    expect(chunkOpeningStock([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
