import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Rate, Space, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import { TableActionButton } from '@/foundation/table';
import { AdminTable } from '@/foundation/table';
import { ColumnSettingsModal, type ColumnItem } from '@/foundation/table/column-settings-modal';
import {
  getListAdminReviewsQueryKey,
  useDeleteAdminReview,
  useListAdminReviews,
  useModerateAdminReview,
} from '@/generated/api/reviews/reviews';
import type { ProductReviewDto } from '@/generated/api/reviews/models';
import { ReviewDetailDrawer } from '../components/review-detail-drawer';
import { getApiErrorMessage } from '@/lib/api/error';

const REVIEW_STATUSES = {
  // Không còn bước chờ duyệt: đánh giá hiển thị ngay, Admin chỉ gỡ khi cần.
  APPROVED: { color: 'green', label: 'Đang hiển thị' },
  REJECTED: { color: 'red', label: 'Đã ẩn' },
};

const REVIEW_COLUMNS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'rating', label: 'Đánh giá sao' },
  { id: 'content', label: 'Nội dung nhận xét' },
  { id: 'comments', label: 'Số phản hồi' },
  { id: 'status', label: 'Trạng thái' },
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
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<ProductReviewDto>();

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const metrics = useMemo(() => {
    const total = items.length;
    const approved = items.filter((i) => i.status === 'APPROVED').length;
    // Không còn hàng chờ duyệt; số cần theo dõi là số đánh giá đã bị gỡ khỏi website.
    const hidden = items.filter((i) => i.status === 'REJECTED').length;
    const avg =
      total > 0
        ? (items.reduce((sum, i) => sum + (i.rating || 0), 0) / total).toFixed(1)
        : '5.0';
    return { total, approved, hidden, avg };
  }, [items]);

  const moderate = useModerateAdminReview({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() });
        void message.success('Đã cập nhật hiển thị của đánh giá.');
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

  const selectedRows = items.filter((row) => selectedIds.includes(row.id));
  const approvable = selectedRows.filter((row) => row.status !== 'APPROVED');
  const hideable = selectedRows.filter((row) => row.status !== 'REJECTED');
  const working = moderate.isPending || deleteReview.isPending;

  /**
   * Duyệt/ẩn chạy tuần tự chứ không song song: mỗi đánh giá là một lệnh ghi riêng
   * có kiểm tra version, bắn đồng loạt sẽ làm khóa hàng và khó biết dòng nào hỏng.
   */
  async function runBulk(action: 'APPROVE' | 'HIDE') {
    const targets = action === 'APPROVE' ? approvable : hideable;
    let done = 0;
    for (const row of targets) {
      try {
        if (action === 'APPROVE') {
          await moderate.mutateAsync({ id: row.id, data: { status: 'APPROVED' } });
        } else {
          await deleteReview.mutateAsync({
            id: row.id,
            data: { expectedVersion: row.version, reason: 'Không phù hợp chính sách hiển thị' },
          });
        }
        done += 1;
      } catch {
        // Thông báo lỗi đã do mutation phát ra; dừng lại để không ghi đè hàng loạt.
        break;
      }
    }
    if (done > 0) {
      void message.success(
        `${action === 'APPROVE' ? 'Đã hiện lại' : 'Đã ẩn'} ${done}/${targets.length} đánh giá.`,
      );
    }
    setSelectedIds([]);
  }

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
    {
      title: '',
      key: 'detail',
      width: 72,
      align: 'right' as const,
      render: (_: unknown, row: ProductReviewDto) => (
        <TableActionButton label="Xem chi tiết đánh giá" icon={<EyeOutlined />} onClick={() => setDetail(row)} />
      ),
    },
  ];

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Ý kiến khách hàng"
        title="Đánh giá & Nhận xét"
        description="Kiểm duyệt đánh giá chất lượng sản phẩm từ người mua hàng trước khi xuất bản ra storefront."
        actions={
          <div className="flex gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void query.refetch()}
                loading={query.isFetching}
                aria-label="Làm mới"
              />
            </Tooltip>
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
            label: 'Đang hiển thị',
            value: metrics.approved,
            icon: <CheckCircleOutlined />,
            tone: 'green',
          },
          {
            key: 'hidden',
            label: 'Đã ẩn',
            value: metrics.hidden,
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

        <PermissionGate permission="catalog.review.moderate">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">
              {selectedIds.length === 0
                ? 'Chọn đánh giá trong bảng để kiểm duyệt'
                : `Đã chọn ${selectedIds.length} đánh giá`}
            </span>
            <Space size="small">
              <Popconfirm
                title={`Duyệt ${approvable.length} đánh giá?`}
                description="Các đánh giá này sẽ hiển thị công khai trên trang sản phẩm."
                disabled={approvable.length === 0 || working}
                onConfirm={() => void runBulk('APPROVE')}
              >
                <Button
                  type="primary"
                  ghost
                  icon={<CheckOutlined />}
                  disabled={approvable.length === 0 || working}
                  loading={moderate.isPending}
                >
                  Hiện lại{approvable.length > 0 ? ` (${approvable.length})` : ''}
                </Button>
              </Popconfirm>
              <Popconfirm
                title={`Ẩn ${hideable.length} đánh giá?`}
                description="Đánh giá vẫn lưu trong hệ thống nhưng bị ẩn khỏi website."
                disabled={hideable.length === 0 || working}
                onConfirm={() => void runBulk('HIDE')}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={hideable.length === 0 || working}
                  loading={deleteReview.isPending}
                >
                  Ẩn{hideable.length > 0 ? ` (${hideable.length})` : ''}
                </Button>
              </Popconfirm>
              {selectedIds.length > 0 && (
                <Button type="text" onClick={() => setSelectedIds([])}>
                  Bỏ chọn
                </Button>
              )}
            </Space>
          </div>
        </PermissionGate>

        <AdminTable
          rowKey="id"
          loading={query.isPending}
          dataSource={items}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          columns={columns}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys.map(String)),
          }}
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
            })
          }
        />
      </ManagementPage>

      <ReviewDetailDrawer review={detail} onClose={() => setDetail(undefined)} />
    </PageTransition>
  );
}
