import { FacebookFilled, TikTokOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { POST_CHANNEL, type PostChannel } from '../model/social-post-filters';

type SocialPostChannel = Exclude<PostChannel, typeof POST_CHANNEL.WEBSITE>;

const CHANNEL_ICON: Record<SocialPostChannel, { label: string; icon: ReactNode }> = {
  [POST_CHANNEL.FACEBOOK]: { label: 'Facebook', icon: <FacebookFilled className="text-blue-600" /> },
  [POST_CHANNEL.TIKTOK]: { label: 'TikTok', icon: <TikTokOutlined className="text-slate-900" /> },
};

/** Biểu tượng kênh mạng xã hội của một bài; không có kênh nào thì hiện "—". */
export function SocialChannelIcons({ channels }: { channels: PostChannel[] }) {
  const social = channels.filter((channel): channel is SocialPostChannel => channel !== POST_CHANNEL.WEBSITE);
  if (!social.length) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-2 text-base">
      {social.map((channel) => (
        <Tooltip key={channel} title={CHANNEL_ICON[channel].label}>
          <span role="img" aria-label={CHANNEL_ICON[channel].label}>
            {CHANNEL_ICON[channel].icon}
          </span>
        </Tooltip>
      ))}
    </span>
  );
}
