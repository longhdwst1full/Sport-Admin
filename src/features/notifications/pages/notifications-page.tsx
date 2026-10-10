import { useState } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  MailOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { App, Select } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import {
  getListAdminNotificationsQueryKey,
  useListAdminNotifications,
  useRequeueAdminNotification,
} from '@/generated/api/notifications/notifications';
import {
  AdminNotificationDtoStatus,
  ListAdminNotificationsStatus,
  type AdminNotificationDto,
} from '@/generated/api/notifications/notifications.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { NotificationTable } from '../components/notification-table';
import { notificationStatusOptions } from '../constants/notification.constants';

/**
 * Hàng đợi email. Ô tìm (`q`), trạng thái (`status`) và trang nằm trên URL; kích thước trang chỉ sống
 * trong màn. Đổi lọc hoặc kích thước trang thì về trang 1.
 */
export function NotificationsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canRequeue = useCan('system.parameter.manage');
  const [pageSize, setPageSize] = useState(ADMIN_TABLE_DEFAULT_PAGE_SIZE);
  const search = useUrlSearch(['q']);
  const { url } = search;
  const status = url.getEnum('status', ListAdminNotificationsStatus);
  const page = url.getNumber('page', 1);
  const [requeueingId, setRequeueingId] = useState<string>();

  const notifications = useListAdminNotifications({
    page,
    limit: pageSize,
    search: url.get('q'),
    status,
  });
  const rows = notifications.data?.items ?? [];

  const requeue = useRequeueAdminNotification({
    mutation: {
      retry: false,
      onMutate: ({ id }) => setRequeueingId(id),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminNotificationsQueryKey() });
        void message.success('Đã đưa thông báo trở lại hàng đợi.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error)),
      onSettled: () => setRequeueingId(undefined),
    },
  });

  function confirmRequeue(row: AdminNotificationDto) {
    modal.confirm({
      title: 'Đưa thông báo trở lại hàng đợi?',
      content:
        'Chỉ thực hiện sau khi đã sửa nguyên nhân lỗi. Worker sẽ gửi lại theo chính sách retry hiện tại.',
      okText: 'Đưa lại hàng đợi',
      onOk: () => requeue.mutateAsync({ id: row.id }),
    });
  }

  return (
    <ManagementPage
      eyebrow="Email operations"
      title="Thông báo email"
      description="Theo dõi hàng đợi gửi email nghiệp vụ và xử lý lại các dead-letter đã khắc phục nguyên nhân."
      metrics={[
        {
          key: 'total',
          label: 'Kết quả phù hợp',
          value: notifications.data?.total ?? 0,
          icon: <MailOutlined />,
          tone: 'blue',
        },
        {
          key: 'pending',
          label: 'Chờ gửi trên trang',
          value: rows.filter((row) => row.status === AdminNotificationDtoStatus.PENDING).length,
          icon: <ClockCircleOutlined />,
          tone: 'orange',
        },
        {
          key: 'done',
          label: 'Đã xử lý trên trang',
          value: rows.filter((row) => row.status === AdminNotificationDtoStatus.DONE).length,
          icon: <CheckCircleOutlined />,
          tone: 'green',
        },
        {
          key: 'dead',
          label: 'Cần xử lý trên trang',
          value: rows.filter((row) => row.status === AdminNotificationDtoStatus.DEAD).length,
          icon: <StopOutlined />,
          tone: 'red',
        },
      ]}
      filters={
        <FilterBar actions={<RefreshButton onRefresh={notifications.refetch} loading={notifications.isFetching} />}>
          <SearchInput
            className="min-w-64 flex-1"
            value={search.values.q}
            onChange={search.setter('q')}
            placeholder="Loại sự kiện, loại hoặc ID nghiệp vụ"
          />
          <Select
            allowClear
            className="min-w-48"
            value={status}
            onChange={(value?: string) => url.patch({ status: value, page: undefined })}
            placeholder="Trạng thái hàng đợi"
            options={notificationStatusOptions}
          />
        </FilterBar>
      }
    >
      {notifications.isError && (
        <QueryErrorAlert
          message="Không tải được trạng thái gửi email"
          error={notifications.error}
          retry={() => void notifications.refetch()}
        />
      )}
      <NotificationTable
        rows={rows}
        loading={notifications.isLoading || notifications.isFetching}
        page={page}
        pageSize={pageSize}
        total={notifications.data?.total ?? 0}
        canRequeue={canRequeue}
        requeueingId={requeueingId}
        onPageChange={(nextPage, nextPageSize) => {
          const first = nextPageSize !== pageSize || nextPage <= 1;
          url.set('page', first ? undefined : nextPage);
          setPageSize(nextPageSize);
        }}
        onRequeue={confirmRequeue}
      />
    </ManagementPage>
  );
}

