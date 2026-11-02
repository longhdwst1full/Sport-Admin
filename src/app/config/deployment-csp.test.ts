// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Production video CSP', () => {
  it('allows Cloudinary video without widening the default/script policy', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const policy = config.headers.find((row) => row.source === '/(.*)')?.headers
      .find((header) => header.key === 'Content-Security-Policy')?.value;
    expect(policy).toBeTruthy();
    const directives = new Map(policy!.split(';').map((value) => {
      const [name, ...sources] = value.trim().split(/\s+/);
      return [name, sources] as const;
    }));
    expect(directives.get('media-src')).toEqual(["'self'", 'blob:', 'https://res.cloudinary.com']);
    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('script-src')).not.toContain('*');
  });
});
