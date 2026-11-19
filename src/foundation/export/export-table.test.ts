import { describe, expect, it } from 'vitest';
import { neutralizeCsvFormula } from './export-table';

describe('neutralizeCsvFormula', () => {
  it.each(['=HYPERLINK("http://x","a")', '+cmd|calc', '@SUM(A1)', '-2+3', '\tx', '\rx'])('chặn công thức %j', (value) => {
    expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
  });
  it.each(['Nguyễn Văn A', '0901234567', '-15', '-15.5', '', '1.200.000 ₫'])('giữ nguyên %j', (value) => {
    expect(neutralizeCsvFormula(value)).toBe(value);
  });
});
