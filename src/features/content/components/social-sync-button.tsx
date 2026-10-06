import { SyncOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { SOCIAL_PERMISSION } from '../constants/social.constants';
import { useSocialSync } from '../hooks/use-social-sync';

/** Nút "Đồng bộ ngay" — chỉ hiện với quyền `social.post.publish` (API cũng kiểm). */
export function SocialSyncButton() {
  const canPublish = useCan(SOCIAL_PERMISSION.PUBLISH);
  const sync = useSocialSync();
  if (!canPublish) return null;
  return (
    <Tooltip title="Chạy ngay một lượt đồng bộ Facebook/TikTok (đối soát, nhập bài, đẩy video, cập nhật chỉ số)">
      <Button icon={<SyncOutlined />} loading={sync.isRunning} onClick={sync.run}>
        Đồng bộ ngay
      </Button>
    </Tooltip>
  );
}
