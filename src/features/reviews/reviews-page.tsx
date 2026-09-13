import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Rate, Space, Table, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ColumnSettingsModal, type ColumnItem } from '@/foundation/table/column-settings-modal';
import {
  getListAdminReviewsQueryKey,
  useDeleteAdminReview,
  useListAdminReviews,
  useModerateAdminReview,
} from '@/generated/api/reviews/reviews';
import type { ProductReviewDto } from '@/generated/api/reviews/models';
import { getApiErrorMessage } from '@/lib/api/error';

const REVIEW_STATUSES = {
  APPROVED: { color: 'green', label: 'Đã duyệt' },
  PENDING: { color: 'gold', label: 'Chờ duyệt' },
  REJECTED: { color: 'red', label: 'Đã ẩn/từ chối' },
};

const REVIEW_COLUMNS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'rating', label: 'Đánh giá sao' },
  { id: 'content', label: 'Nội dung nhận xét' },
  { id: 'comments', label: 'Số phản hồi' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'actions', label: 'Kiểm duyệt', fixed: true },
];

export function ReviewsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const query = useListAdminReviews();
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>({
    customer: true,
    rating: true,
    content: true,
    comments: true,
    status: true,
    actions: true,
  });

  const items = query.data?.items ?? [];

  const metrics = useMemo(() => {
    const total = items.length;
    const approved = items.filter((i) => i.status === 'APPROVED').length;
    const pending = items.filter((i) => i.status !== 'APPROVED' && i.status !== 'REJECTED').length;
    const avg =
      total > 0
        ? (items.reduce((sum, i) => sum + (i.rating || 0), 0) / total).toFixed(1)
        : '5.0';
    return { total, approved, pending, avg };
  }, [items]);

  const moderate = useModerateAdminReview({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() });
        void message.success('Đã cập nhật trạng thái duyệt đánh giá.');
      },
      onError: (error) =>
        void message.error(getApiErrorMessage(error, 'Không thể kiểm duyệt đánh giá.')),
    },
  });

  const deleteReview = useDeleteAdminReview({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() });
        void message.success('Đã ẩn đánh giá khỏi website.');
      },
      onError: (error) =>
        void message.error(getApiErrorMessage(error, 'Không thể xóa đánh giá.')),
    },
  });

  const columns = [
    ...(colVisibility.customer !== false
      ? [
          {
            title: 'Khách hàng',
            key: 'customer',
            fixed: 'left' as const,
            width: 220,
            render: (_: unknown, row: ProductReviewDto) => (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                  {row.customerDisplayName ? row.customerDisplayName.slice(0, 1).toUpperCase() : 'K'}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 text-xs block truncate">
                    {row.customerDisplayName}
                  </span>
                  <div className="text-[11px] text-slate-400">
                    {row.verifiedPurchase ? (
                      <span className="text-emerald-600 font-medium">✓ Đã mua hàng</span>
                    ) : (
                      'Chưa xác minh đơn'
                    )}
                  </div>
                </div>
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.rating !== false
      ? [
          {
            title: 'Đánh giá',
            dataIndex: 'rating',
            width: 160,
            render: (value: number) => <Rate disabled value={value} className="text-sm" />,
          },
        ]
      : []),
    ...(colVisibility.content !== false
      ? [
          {
            title: 'Nội dung nhận xét',
            dataIndex: 'content',
            render: (value: string) => (
              <p className="text-xs text-slate-700 leading-relaxed max-w-xl m-0 line-clamp-3">
                {value}
              </p>
            ),
          },
        ]
      : []),
    ...(colVisibility.comments !== false
      ? [
          {
            title: 'Phản hồi',
            dataIndex: 'comments',
            align: 'center' as const,
            width: 100,
            render: (value: unknown[]) => (
              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                {value?.length ?? 0}
              </span>
            ),
          },
        ]
      : []),
    ...(colVisibility.status !== false
      ? [
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 140,
            render: (value: string) => (
              <StatusTag
                status={value}
                presentations={REVIEW_STATUSES as Record<string, { label: string; color: string }>}
              />
            ),
          },
        ]
      : []),
    ...(colVisibility.actions !== false
      ? [
          {
            title: 'Kiểm duyệt',
            key: 'actions',
            width: 200,
            fixed: 'right' as const,
            align: 'right' as const,
            render: (_: unknown, row: ProductReviewDto) => (
              <PermissionGate permission="review.moderate">
                <Space size="small">
                  <Popconfirm
                    title="Duyệt đánh giá này?"
                    description="Đánh giá sẽ được hiển thị công khai trên trang sản phẩm."
                    disabled={row.status === 'APPROVED'}
                    onConfirm={() =>
                      moderate.mutate({ id: row.id, data: { status: 'APPROVED' } })
                    }
                  >
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      disabled={row.status === 'APPROVED'}
                      loading={moderate.isPending && moderate.variables?.id === row.id}
                      icon={<CheckOutlined />}
                      className="text-xs"
                    >
                      Duyệt
                    </Button>
                  </Popconfirm>

                  <Popconfirm
                    title="Ẩn đánh giá này?"
                    description="Đánh giá sẽ được lưu trong hệ thống nhưng bị ẩn khỏi website."
                    disabled={row.status === 'REJECTED'}
                    onConfirm={() =>
                      deleteReview.mutate({
                        id: row.id,
                        data: {
                          expectedVersion: row.version,
                          reason: 'Không phù hợp chính sách hiển thị',
                        },
                      })
                    }
                  >
                    <Button
                      danger
                      size="small"
                      disabled={row.status === 'REJECTED'}
                      loading={deleteReview.isPending && deleteReview.variables?.id === row.id}
                      icon={<DeleteOutlined />}
                      className="text-xs"
                    >
                      Ẩn
                    </Button>
                  </Popconfirm>
                </Space>
              </PermissionGate>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Ý kiến khách hàng"
        title="Đánh giá & Nhận xét"
        description="Kiểm duyệt đánh giá chất lượng sản phẩm từ người mua hàng trước khi xuất bản ra storefront."
        dataNotice="Chỉ tài khoản có quyền review.moderate mới được duyệt hoặc gỡ bỏ đánh giá khỏi website."
        actions={
          <div className="flex gap-2">
            <Button icon={<ReloadOutlined />} onClick={() => void query.refetch()}>
              Làm mới
            </Button>
          </div>
        }
        metrics={[
          {
            key: 'total',
            label: 'Tổng đánh giá',
            value: metrics.total,
            icon: <StarFilled />,
            tone: 'blue',
          },
          {
            key: 'approved',
            label: 'Đã duyệt công khai',
            value: metrics.approved,
            icon: <CheckCircleOutlined />,
            tone: 'green',
          },
          {
            key: 'pending',
            label: 'Chờ kiểm duyệt',
            value: metrics.pending,
            icon: <ClockCircleOutlined />,
            tone: 'orange',
          },
          {
            key: 'rating',
            label: 'Điểm trung bình',
            value: `${metrics.avg} / 5`,
            icon: <StarOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <div className="flex w-full justify-end">
            <Button
              icon={<SettingOutlined />}
              onClick={() => setColumnModalOpen(true)}
              className="text-slate-600"
            >
              Tùy chỉnh cột
            </Button>
          </div>
        }
      >
        {query.isError && (
          <div className="mb-4">
            <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />
          </div>
        )}

        <Table
          rowKey="id"
          loading={query.isPending}
          dataSource={items}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          columns={columns}
        />

        <ColumnSettingsModal
          isOpen={columnModalOpen}
          onClose={() => setColumnModalOpen(false)}
          columns={REVIEW_COLUMNS}
          visibility={colVisibility}
          onChange={setColVisibility}
          onReset={() =>
            setColVisibility({
              customer: true,
              rating: true,
              content: true,
              comments: true,
              status: true,
              actions: true,
            })
          }
        />
      </ManagementPage>
    </PageTransition>
  );
}
