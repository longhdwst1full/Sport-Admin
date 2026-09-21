import { describe, expect, it } from 'vitest';
import { changeFor, shortfallFor } from './pos-cash';

describe('tiền thối tại quầy', () => {
  it('trả lại phần chênh khi khách đưa dư', () => {
    expect(changeFor(18_500_000, 20_000_000)).toBe(1_500_000);
  });

  it('không tính tiền thối khi khách đưa thiếu', () => {
    expect(changeFor(20_000_000, 18_000_000)).toBeNull();
    expect(shortfallFor(20_000_000, 18_000_000)).toBe(2_000_000);
  });

  it('chưa nhập thì không hiện gì', () => {
    expect(changeFor(20_000_000, null)).toBeNull();
    expect(shortfallFor(20_000_000, undefined)).toBeNull();
  });

  it('đưa đúng số tiền thì thối 0 chứ không phải chưa nhập', () => {
    expect(changeFor(20_000_000, 20_000_000)).toBe(0);
    expect(shortfallFor(20_000_000, 20_000_000)).toBeNull();
  });
});
