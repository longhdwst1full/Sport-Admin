import { describe, expect, it } from 'vitest';
import { refreshDelayMs } from './access-token-expiry';

describe('refreshDelayMs', () => {
  it('xoay trước 60 giây với token 15 phút', () => {
    expect(refreshDelayMs(900)).toBe(840_000);
  });

  /** Token ngắn thì 60 giây đệm còn dài hơn cả vòng đời; lấy nửa vòng đời thay vì số âm. */
  it('không xoay sớm hơn nửa vòng đời với token ngắn', () => {
    expect(refreshDelayMs(90)).toBe(45_000);
  });

  it('không hẹn giờ ngắn hơn 30 giây', () => {
    expect(refreshDelayMs(10)).toBe(30_000);
  });

  it('không hẹn giờ khi server không nói thời hạn', () => {
    expect(refreshDelayMs(0)).toBeUndefined();
    expect(refreshDelayMs(undefined)).toBeUndefined();
  });
});
