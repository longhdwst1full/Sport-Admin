import { describe, expect, it } from 'vitest';
import { SOCIAL_CHANNEL } from '../constants/social.constants';
import { channelsOfSelection, SOCIAL_CHANNEL_SELECTION } from './social-channel-selection';

describe('channelsOfSelection', () => {
  it('keeps TikTok as a TikTok-only selection', () => {
    expect(channelsOfSelection(SOCIAL_CHANNEL.TIKTOK)).toEqual([SOCIAL_CHANNEL.TIKTOK]);
  });

  it('only selects both channels through the explicit combined option', () => {
    expect(channelsOfSelection(SOCIAL_CHANNEL_SELECTION.BOTH)).toEqual([
      SOCIAL_CHANNEL.FACEBOOK,
      SOCIAL_CHANNEL.TIKTOK,
    ]);
  });
});
