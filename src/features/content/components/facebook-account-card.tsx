import { ExportOutlined, FacebookFilled, SettingOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Skeleton, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { RefreshButton } from '@/foundation/table';
import { useGetAdminFacebookAccount } from '@/generated/api/content/content';
import { formatDateTime } from '@/lib/format/datetime';
import { FACEBOOK_SETTINGS_PATH } from '../constants/social.constants';

/** Page/token chỉ đọc từ backend; trạng thái kết nối và quyền được xác minh độc lập, không suy quyền từ cấu hình. */
export function FacebookAccountCard() {
  const canViewParameters = useCan('system.parameter.view');
  const account = useGetAdminFacebookAccount({
    query: { retry: false, staleTime: 60_000, refetchOnWindowFocus: false },
  });
  const data = account.data;

  return (
    <Card
      size="small"
      className="mb-3"
      title={
        <span className="flex items-center gap-2">
          <FacebookFilled className="text-[#1877f2]" aria-hidden /> Tài khoản Facebook
        </span>
      }
      extra={
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton onRefresh={account.refetch} loading={account.isFetching} />
          {canViewParameters && (
            <Link to={FACEBOOK_SETTINGS_PATH}>
              <Button size="small" icon={<SettingOutlined />}>Cấu hình</Button>
            </Link>
          )}
        </div>
      }
    >
      {account.isLoading ? (
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      ) : account.isError ? (
        <QueryErrorAlert
          error={account.error}
          message="Không tải được trạng thái tài khoản Facebook"
          retry={() => void account.refetch()}
        />
      ) : data ? (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Tag color={data.connected ? 'green' : data.reconnectRequired ? 'red' : 'orange'} className="!m-0">
              {data.connected ? 'Đã xác minh Page' : data.reconnectRequired ? 'Cần cập nhật token' : data.configured ? 'Chưa xác minh được' : 'Chưa cấu hình'}
            </Tag>
            {data.accountName && <span className="font-medium text-slate-800">{data.accountName}</span>}
            {data.pageUrl && (
              <a href={data.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs">
                Xem Page <ExportOutlined aria-hidden />
              </a>
            )}
          </div>
          {!data.connected && <Alert type="warning" showIcon message={data.message} />}
          {data.pageId && <div className="text-xs text-slate-600">Page ID: {data.pageId}</div>}
          {data.configured && (
            <div className="text-xs text-slate-600">
              <span className="text-slate-500">Quyền: </span>
              {data.permissionsVerified
                ? data.scopes.length ? data.scopes.join(', ') : 'Meta chưa trả về quyền nào được cấp.'
                : 'Chưa xác minh được quyền. Loại token này có thể không cho phép đọc danh sách quyền.'}
            </div>
          )}
          <div className="text-xs text-slate-500">Kiểm tra lúc: {formatDateTime(data.checkedAt)}</div>
        </div>
      ) : null}
    </Card>
  );
}
