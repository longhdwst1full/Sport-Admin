import { describe, expect, it } from 'vitest';
import { supportAssigneeLabel, toSupportAssigneeOptions } from './support-assignee.mapper';

describe('supportAssigneeLabel', () => {
  it('appends the masked email the API returned, verbatim', () => {
    expect(supportAssigneeLabel({ userId: '1', displayName: 'Nguyễn Văn A', maskedEmail: 'na***@dctd.vn' })).toBe(
      'Nguyễn Văn A — na***@dctd.vn',
    );
  });

  it('falls back to the name alone when the email is null, undefined or blank', () => {
    expect(supportAssigneeLabel({ userId: '1', displayName: 'Bình', maskedEmail: null })).toBe('Bình');
    expect(supportAssigneeLabel({ userId: '1', displayName: 'Bình' })).toBe('Bình');
    expect(supportAssigneeLabel({ userId: '1', displayName: 'Bình', maskedEmail: '   ' })).toBe('Bình');
  });
});

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

  it('keeps two staff with the same fullName distinguishable by their masked email', () => {
    const options = toSupportAssigneeOptions(undefined, [
      { userId: '2', displayName: 'Nguyễn Văn A', maskedEmail: 'na***@dctd.vn' },
      { userId: '3', displayName: 'Nguyễn Văn A', maskedEmail: 'nv***@dctd.vn' },
    ]);
    expect(options).toEqual([
      { value: '2', label: 'Nguyễn Văn A — na***@dctd.vn' },
      { value: '3', label: 'Nguyễn Văn A — nv***@dctd.vn' },
    ]);
    expect(new Set(options.map((option) => option.label)).size).toBe(2);
  });

  it('keeps the option value as the user id and never leaks the email into it', () => {
    expect(
      toSupportAssigneeOptions(undefined, [{ userId: '7', displayName: 'Bình', maskedEmail: 'bi***@dctd.vn' }]),
    ).toEqual([{ value: '7', label: 'Bình — bi***@dctd.vn' }]);
  });

  it('leaves the "Tôi" option without an email because the prefix already distinguishes it', () => {
    expect(
      toSupportAssigneeOptions({ userId: '1', displayName: 'Nguyễn Văn A' }, [
        { userId: '2', displayName: 'Nguyễn Văn A', maskedEmail: 'nv***@dctd.vn' },
      ]),
    ).toEqual([
      { value: '1', label: 'Tôi (Nguyễn Văn A)' },
      { value: '2', label: 'Nguyễn Văn A — nv***@dctd.vn' },
    ]);
  });
});
