import { describe, expect, it } from 'vitest';
import { SOCIAL_CHANNEL } from '../constants/social.constants';
import { nextSelectedChannels, tiktokMediaViolation } from './tiktok-post-settings';

describe('tiktokMediaViolation', () => {
  it('accepts exactly one video', () => {
    expect(tiktokMediaViolation(['VIDEO'])).toBeUndefined();
  });

  it('rejects no media, images, or more than one item', () => {
    expect(tiktokMediaViolation([])).toBeDefined();
    expect(tiktokMediaViolation(['IMAGE'])).toBeDefined();
    expect(tiktokMediaViolation(['VIDEO', 'VIDEO'])).toBeDefined();
    expect(tiktokMediaViolation(['VIDEO', 'IMAGE'])).toBeDefined();
  });
});

describe('nextSelectedChannels', () => {
  it('keeps the previous selection when the last channel is unchecked', () => {
    expect(nextSelectedChannels([SOCIAL_CHANNEL.FACEBOOK], [])).toEqual([SOCIAL_CHANNEL.FACEBOOK]);
  });

  it('applies a non-empty selection', () => {
    expect(nextSelectedChannels([SOCIAL_CHANNEL.FACEBOOK], [SOCIAL_CHANNEL.FACEBOOK, SOCIAL_CHANNEL.TIKTOK])).toEqual([
      SOCIAL_CHANNEL.FACEBOOK,
      SOCIAL_CHANNEL.TIKTOK,
    ]);
  });
});
