import { SOCIAL_CHANNEL, type SocialChannel } from '../constants/social.constants';

export const SOCIAL_CHANNEL_SELECTION = {
  BOTH: 'facebook+tiktok',
} as const;

export type SocialChannelSelection = SocialChannel | (typeof SOCIAL_CHANNEL_SELECTION)['BOTH'];

/** CONTRACT: lựa chọn đơn của UI được đổi thành mảng `channels` mà API tạo bài mạng xã hội yêu cầu. */
export const channelsOfSelection = (selection: SocialChannelSelection): SocialChannel[] =>
  selection === SOCIAL_CHANNEL_SELECTION.BOTH
    ? [SOCIAL_CHANNEL.FACEBOOK, SOCIAL_CHANNEL.TIKTOK]
    : [selection];
