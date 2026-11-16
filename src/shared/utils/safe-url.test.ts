import { describe, expect, it } from 'vitest';
import { toSafeExternalUrl } from './safe-url';

describe('toSafeExternalUrl', () => {
  it('accepts absolute http(s) URLs', () => {
    expect(toSafeExternalUrl('https://online-gateway.ghn.vn/a5/public-api/printA5?token=abc')).toBe(
      'https://online-gateway.ghn.vn/a5/public-api/printA5?token=abc',
    );
    expect(toSafeExternalUrl(' http://localhost:4000/x ')).toBe('http://localhost:4000/x');
  });

  it.each([
    'javascript:alert(document.cookie)',
    ' JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '/relative/path',
    '//evil.example/x',
    '',
    undefined,
    null,
    42,
  ])('rejects %s', (value) => {
    expect(toSafeExternalUrl(value)).toBeUndefined();
  });
});
