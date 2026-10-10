import { DisconnectOutlined, LinkOutlined, TikTokOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Popconfirm, Skeleton, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { StatusTag } from '@/foundation/management';
import {
  disconnectAdminTikTokAccount,
  getGetAdminTikTokAccountQueryKey,
  getGetAdminTikTokCreatorInfoQueryKey,
  startAdminTikTokConnect,
  useGetAdminTikTokAccount,
} from '@/generated/api/content/content';
import type { TikTokAccountDto } from '@/generated/api/content/content.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import {
  FACEBOOK_SETTINGS_PATH,
  SOCIAL_PERMISSION,
  TIKTOK_CALLBACK_PATH,
  TIKTOK_CONNECTION,
  TIKTOK_PARAMETER_CODES,
  tiktokConnectionPresentation,
  type TikTokConnectionState,
} from '../constants/social.constants';
import { socialCommandErrorMessage } from '../model/social-command-error';
import { rememberTikTokReturnPath } from '../model/tiktok-connect-return';

function toTikTokConnectionState(account: TikTokAccountDto): TikTokConnectionState {
  if (!account.appConfigured) return TIKTOK_CONNECTION.APP_NOT_CONFIGURED;
  if (account.connected && !account.reconnectRequired) return TIKTOK_CONNECTION.CONNECTED;
  if (account.reconnectRequired) return TIKTOK_CONNECTION.RECONNECT_REQUIRED;
  return TIKTOK_CONNECTION.NOT_CONNECTED;
}

/**
 * Tài khoản TikTok đăng bài (một tài khoản cho cả hệ thống): trạng thái kết nối, tên, quyền (scopes), hạn token.
 * Xem cần `social.post.manage`; Kết nối/Ngắt kết nối cần `social.post.publish` (API kiểm lại).
 * Kết nối: API trả `authorizeUrl` → chuyển trang sang TikTok → TikTok quay về `TIKTOK_CALLBACK_PATH`.
 */
export function TikTokAccountCard() {
  const { message } = App.useApp();
  const location = useLocation();
  const queryClient = useQueryClient();
  const canPublish = useCan(SOCIAL_PERMISSION.PUBLISH);
  const canViewParameters = useCan('system.parameter.view');
  const account = useGetAdminTikTokAccount({ query: { retry: false } });

  const connect = useMutation({
    mutationFn: () => startAdminTikTokConnect(),
    onSuccess: ({ authorizeUrl }) => {
      rememberTikTokReturnPath(`${location.pathname}${location.search}`);
      window.location.assign(authorizeUrl);
    },
    onError: (error) => void message.error(socialCommandErrorMessage(error)),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectAdminTikTokAccount({ reason: 'Ngắt kết nối từ Admin' }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(getGetAdminTikTokAccountQueryKey(), saved);
      await queryClient.invalidateQueries({ queryKey: getGetAdminTikTokCreatorInfoQueryKey() });
      void message.success('Đã ngắt kết nối tài khoản TikTok');
    },
    onError: (error) => void message.error(socialCommandErrorMessage(error)),
  });

  const data = account.data;
  const live = data?.connected === true && !data.reconnectRequired;

  return (
    <Card
      size="small"
      className="mb-3"
      title={
        <span className="flex items-center gap-2">
          <TikTokOutlined aria-hidden /> Tài khoản TikTok
        </span>
      }
      extra={
        data && canPublish && data.appConfigured ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="small"
              type={live ? 'default' : 'primary'}
              icon={<LinkOutlined />}
              loading={connect.isPending}
              onClick={() => connect.mutate()}
            >
              {data.connected ? 'Kết nối lại' : 'Kết nối'}
            </Button>
            {data.connected && (
              <Popconfirm
                title="Ngắt kết nối tài khoản TikTok?"
                description="Xoá token đã lưu (không thu hồi phía TikTok). Video đang đăng dừng lại tới khi kết nối lại; chỉ số TikTok ngừng đồng bộ."
                okText="Ngắt kết nối"
                okButtonProps={{ danger: true }}
                cancelText="Huỷ"
                onConfirm={() => disconnect.mutate()}
              >
                <Button size="small" danger icon={<DisconnectOutlined />} loading={disconnect.isPending}>
                  Ngắt kết nối
                </Button>
              </Popconfirm>
            )}
          </div>
        ) : null
      }
    >
      {account.isLoading ? (
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      ) : account.isError ? (
        <QueryErrorAlert
          error={account.error}
          message="Không tải được trạng thái tài khoản TikTok"
          description={socialCommandErrorMessage(account.error)}
          retry={() => void account.refetch()}
        />
      ) : data ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={toTikTokConnectionState(data)} presentations={tiktokConnectionPresentation} />
            {data.accountName && <span className="font-medium text-slate-800">{data.accountName}</span>}
          </div>
          {!data.appConfigured && (
            <Typography.Paragraph type="secondary" className="!mb-0 text-xs">
              Cần nhập {TIKTOK_PARAMETER_CODES.join(', ')} trong{' '}
              {canViewParameters ? <Link to={FACEBOOK_SETTINGS_PATH}>Tham số hệ thống</Link> : 'Tham số hệ thống (liên hệ quản trị viên)'}.
              TIKTOK_REDIRECT_URI ={' '}
              <Typography.Text code copyable className="text-xs">
                {`${window.location.origin}${TIKTOK_CALLBACK_PATH}`}
              </Typography.Text>
            </Typography.Paragraph>
          )}
          {data.appConfigured && !live && !canPublish && (
            <Typography.Paragraph type="secondary" className="!mb-0 text-xs">
              Người có quyền đăng bài mạng xã hội cần kết nối tài khoản TikTok trước khi đăng video.
            </Typography.Paragraph>
          )}
          {data.connected && (
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
              <div>
                <dt className="inline text-slate-500">Quyền: </dt>
                <dd className="inline">{data.scopes.length ? data.scopes.join(', ') : '—'}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Access token hết hạn: </dt>
                <dd className="inline">{data.accessExpiresAt ? formatDateTime(data.accessExpiresAt) : '—'}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Phải kết nối lại trước: </dt>
                <dd className="inline">{data.refreshExpiresAt ? formatDateTime(data.refreshExpiresAt) : '—'}</dd>
              </div>
            </dl>
          )}
        </div>
      ) : null}
    </Card>
  );
}
