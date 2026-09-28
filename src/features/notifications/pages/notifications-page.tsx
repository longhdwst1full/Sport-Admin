import { useState } from 'react';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  MailOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Input, Select, Tooltip } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useCan } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import {
  getListAdminNotificationsQueryKey,
  useListAdminNotifications,
  useRequeueAdminNotification,
} from '@/generated/api/notifications/notifications';
import type {
  AdminNotificationDto,
  ListAdminNotificationsStatus,
} from '@/generated/api/notifications/notifications.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { NotificationTable } from '../components/notification-table';
import {
  NOTIFICATION_DEFAULT_PAGE_SIZE,
  notificationStatusOptions,
} from '../constants/notification.constants';

export function NotificationsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const canRequeue = useCan('system.parameter.manage');
  const [pageSize, setPageSize] = useState(NOTIFICATION_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListAdminNotificationsStatus>();
  const [requeueingId, setRequeueingId] = useState<string>();
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [page, setPage] = useListPageReset([debouncedSearch, status, pageSize]);

  const notifications = useListAdminNotifications({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
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
      cancelText: 'Hủy',
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
          value: rows.filter((row) => row.status === 'PENDING').length,
          icon: <ClockCircleOutlined />,
          tone: 'orange',
        },
        {
          key: 'done',
          label: 'Đã xử lý trên trang',
          value: rows.filter((row) => row.status === 'DONE').length,
          icon: <CheckCircleOutlined />,
          tone: 'green',
        },
        {
          key: 'dead',
          label: 'Cần xử lý trên trang',
          value: rows.filter((row) => row.status === 'DEAD').length,
          icon: <StopOutlined />,
          tone: 'red',
        },
      ]}
      filters={
        <div className="flex w-full flex-wrap gap-3">
          <Input.Search
            allowClear
            className="min-w-64 flex-1"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Loại sự kiện, loại hoặc ID nghiệp vụ"
          />
          <Select
            allowClear
            className="min-w-48"
            value={status}
            onChange={setStatus}
            placeholder="Trạng thái hàng đợi"
            options={notificationStatusOptions}
          />
          <Tooltip title="Làm mới dữ liệu">
            <Button
              aria-label="Làm mới"
              icon={<ReloadOutlined />}
              loading={notifications.isFetching}
              onClick={() => void notifications.refetch()}
            />
          </Tooltip>
        </div>
      }
    >
      {notifications.isError && (
        <Alert
          className="mb-5"
          type="error"
          showIcon
          message="Không tải được trạng thái gửi email"
          description={getApiErrorMessage(notifications.error)}
          action={<Button onClick={() => void notifications.refetch()}>Thử lại</Button>}
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
          setPage(nextPageSize === pageSize ? nextPage : 1);
          setPageSize(nextPageSize);
        }}
        onRequeue={confirmRequeue}
      />
    </ManagementPage>
  );
}

