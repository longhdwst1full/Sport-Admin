import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Backend xuất permission của từng operation ra OpenAPI dưới `x-required-permissions`, nên FE
 * không phải chép tay permission code. Test này canh: mọi quyền backend đòi đều phải được UI
 * kiểm tra ở đâu đó, nếu không người dùng sẽ thấy nút rồi mới nhận 403.
 *
 * Đây là bảo vệ UX/least-privilege, KHÔNG phải ranh giới bảo mật — backend vẫn là nơi chặn thật.
 */
const CONTRACT_DIR = new URL('../../../contracts/admin/', import.meta.url).pathname;
const SOURCE_DIR = new URL('../../', import.meta.url).pathname;

/** Quyền backend chưa có màn hình tương ứng; thêm vào đây phải kèm lý do. */
const NOT_YET_IN_UI: Record<string, string> = {};

function collectRequiredPermissions(): Set<string> {
  const codes = new Set<string>();
  for (const file of readdirSync(CONTRACT_DIR).filter((name) => name.endsWith('.yaml'))) {
    const lines = readFileSync(join(CONTRACT_DIR, file), 'utf8').split('\n');
    let inBlock = false;
    for (const line of lines) {
      if (line.trimEnd().endsWith('x-required-permissions:')) {
        inBlock = true;
        continue;
      }
      if (!inBlock) continue;
      const item = /^\s*-\s+([\w.]+)\s*$/.exec(line);
      if (item) codes.add(item[1]);
      else inBlock = false;
    }
  }
  return codes;
}

function collectCheckedPermissions(): Set<string> {
  const codes = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'generated') walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry) || entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
        continue;
      }
      const source = readFileSync(path, 'utf8');
      for (const [, code] of source.matchAll(/['"]([a-z_]+(?:\.[a-z_]+)+)['"]/g)) {
        codes.add(code);
      }
    }
  };
  walk(SOURCE_DIR);
  return codes;
}

describe('admin permission coverage', () => {
  const required = collectRequiredPermissions();
  const checked = collectCheckedPermissions();

  it('reads permission codes out of the generated contract', () => {
    expect(required.size).toBeGreaterThan(30);
    expect(required.has('payment.confirm')).toBe(true);
  });

  it('checks every backend permission somewhere in the UI', () => {
    const missing = [...required]
      .filter((code) => !checked.has(code) && !(code in NOT_YET_IN_UI))
      .sort();

    expect(missing).toEqual([]);
  });

  it('keeps the not-yet-implemented list honest', () => {
    const stale = Object.keys(NOT_YET_IN_UI).filter((code) => checked.has(code));

    expect(stale).toEqual([]);
  });
});
