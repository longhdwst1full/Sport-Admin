// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { htmlToPlainText, plainTextToHtml } from './plain-text-html';

describe('plain text ⇄ html', () => {
  it('chuyển br/khối thành xuống dòng và giải mã entity', () => {
    expect(htmlToPlainText('Dòng 1<br>Dòng 2<p>Đoạn &amp; tiếp</p>')).toBe('Dòng 1\nDòng 2Đoạn & tiếp');
    expect(htmlToPlainText('<p>A</p><p>B</p>')).toBe('A\nB');
  });

  it('giữ URL khi chữ link khác URL', () => {
    expect(htmlToPlainText('Xem <a href="https://shop.vn">tại đây</a>')).toBe('Xem tại đây (https://shop.vn)');
    expect(htmlToPlainText('<a href="https://shop.vn">https://shop.vn</a>')).toBe('https://shop.vn');
  });

  it('round-trip văn bản thuần', () => {
    const text = 'Giá <100k & freeship\n\nhttps://shop.vn';
    expect(htmlToPlainText(plainTextToHtml(text))).toBe(text);
  });
});
