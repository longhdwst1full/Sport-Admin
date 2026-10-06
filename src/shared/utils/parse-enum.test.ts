import { describe, expect, it } from 'vitest';
import { parseEnum } from './parse-enum';

const Status = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const;

describe('parseEnum', () => {
  it('nhận giá trị hợp lệ từ object hoặc mảng', () => {
    expect(parseEnum(Status, 'OPEN')).toBe('OPEN');
    expect(parseEnum(['A', 'B'] as const, 'B')).toBe('B');
  });

  it('bỏ giá trị lạ, rỗng và key có sẵn của object', () => {
    expect(parseEnum(Status, 'open')).toBeUndefined();
    expect(parseEnum(Status, null)).toBeUndefined();
    expect(parseEnum(Status, 'toString')).toBeUndefined();
  });
});
