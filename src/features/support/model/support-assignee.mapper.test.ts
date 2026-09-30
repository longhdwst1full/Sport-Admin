import { describe, expect, it } from 'vitest';
import { toSupportAssigneeOptions } from './support-assignee.mapper';

describe('toSupportAssigneeOptions', () => {
  it('puts the signed-in user first as "Tôi" and drops the duplicate candidate', () => {
    expect(
      toSupportAssigneeOptions({ userId: '1', displayName: 'An' }, [
        { userId: '2', displayName: 'Bình' },
        { userId: '1', displayName: 'An' },
      ]),
    ).toEqual([
      { value: '1', label: 'Tôi (An)' },
      { value: '2', label: 'Bình' },
    ]);
  });

  it('returns only candidates when there is no signed-in profile', () => {
    expect(toSupportAssigneeOptions(undefined, [{ userId: '2', displayName: 'Bình' }])).toEqual([
      { value: '2', label: 'Bình' },
    ]);
  });
});
