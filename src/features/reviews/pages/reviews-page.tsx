import {
  CheckCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm, Rate, Select, Space } from 'antd';
import { useMemo, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import type { ColumnsType } from 'antd/es/table';
import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  AdminTable,
  col,
  ColumnSettingsModal,
  FilterBar,
  RefreshButton,
  TableActionButton,
  useColumnVisibility,
} from '@/foundation/table';
import {
  getListAdminReviewsQueryKey,
  useDeleteAdminReview,
  useListAdminReviews,
  useModerateAdminReview,
} from '@/generated/api/reviews/reviews';
import { ReviewModerationStatus, type ProductReviewDto } from '@/generated/api/reviews/reviews.schemas';
import { useUrlFilters } from '@/shared/hooks/use-url-filters';
import { ReviewDetailDrawer } from '../components/review-detail-drawer';
import { REVIEW_COLUMN_ITEMS, REVIEW_STATUS_OPTIONS, REVIEW_STATUS_PRESENTATION } from '../constants/review.constants';
import { getReviewMetrics } from '../model/review-moderation.policy';
import { getApiErrorMessage } from '@/lib/api/error';

/** Cột dữ liệu (không phụ thuộc handler); `key` khớp `REVIEW_COLUMN_ITEMS` để ẩn/hiện được. */
const REVIEW_TABLE_COLUMNS: ColumnsType<ProductReviewDto> = [
  {
    title: 'Khách hàng',
    key: 'customer',
    fixed: 'left',
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
  {
    title: 'Đánh giá',
    key: 'rating',
    dataIndex: 'rating',
    width: 160,
    render: (value: number) => <Rate disabled value={value} className="text-sm" />,
  },
  {
    title: 'Nội dung nhận xét',
    key: 'content',
    dataIndex: 'content',
    render: (value: string) => (
      <p className="text-xs text-slate-700 leading-relaxed max-w-xl m-0 line-clamp-3">
        {value}
      </p>
    ),
  },
  {
    title: 'Phản hồi',
    key: 'comments',
    dataIndex: 'comments',
    align: 'center',
    width: 100,
    render: (value: unknown[]) => (
      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
        {value?.length ?? 0}
      </span>
    ),
  },
  col.status<ProductReviewDto, ProductReviewDto['status']>('status', 'Trạng thái', REVIEW_STATUS_PRESENTATION, { width: 140 }),
];

export function ReviewsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const url = useUrlFilters();
  const statusFilter = url.getEnum('status', ReviewModerationStatus);
  const page = url.getNumber('page', 1);
  const query = useListAdminReviews();
  const columnVisibility = useColumnVisibility(REVIEW_COLUMN_ITEMS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<ProductReviewDto>();

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const metrics = useMemo(() => getReviewMetrics(items), [items]);
  // API trả toàn bộ danh sách (chưa có tham số lọc/phân trang); lọc trạng thái chạy ở client, còn
  // trạng thái và trang nằm trên URL để F5/gửi link giữ nguyên vị trí.
  const visibleItems = useMemo(
    () => (statusFilter ? items.filter((item) => item.status === statusFilter) : items),
    [items, statusFilter],
  );

  const moderate = useModerateAdminReview({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() });
        void message.success('Đã cập nhật trạng thái kiểm duyệt.');
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
        void message.error(getApiErrorMessage(error, 'Không thể xoá đánh giá.')),
    },
  });

  const selectedRows = items.filter((row) => selectedIds.includes(row.id));
  const approvable = selectedRows.filter((row) => row.status !== 'APPROVED');
  const hideable = selectedRows.filter((row) => row.status !== 'REJECTED');
  const working = moderate.isPending || deleteReview.isPending;

  /**
   * Khôi phục/ẩn chạy tuần tự chứ không song song: mỗi đánh giá là một lệnh ghi riêng
   * có kiểm tra version, bắn đồng loạt sẽ làm khoá hàng và khó biết dòng nào hỏng.
   * Đánh giá đã lên thẳng APPROVED từ lúc khách gửi; hai action này chỉ là hậu kiểm
   * (khôi phục hiển thị / ẩn khỏi storefront), không còn ý nghĩa "duyệt lần đầu".
   */
  async function runBulk(action: 'RESTORE' | 'HIDE') {
    const targets = action === 'RESTORE' ? approvable : hideable;
    let done = 0;
    for (const row of targets) {
      try {
        if (action === 'RESTORE') {
          await moderate.mutateAsync({
            id: row.id,
            data: { status: 'APPROVED', expectedVersion: row.version },
          });
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
        `${action === 'RESTORE' ? 'Đã khôi phục hiển thị' : 'Đã ẩn'} ${done}/${targets.length} đánh giá.`,
      );
    }
    setSelectedIds([]);
  }

  const allColumns = useMemo<ColumnsType<ProductReviewDto>>(
    () => [
      ...REVIEW_TABLE_COLUMNS,
      col.actions<ProductReviewDto>(
        (row) => <TableActionButton label="Xem chi tiết đánh giá" icon={<EyeOutlined />} onClick={() => setDetail(row)} />,
        { key: 'detail', title: '', width: 72, fixed: undefined },
      ),
    ],
    [],
  );
  const columns = columnVisibility.apply(allColumns);

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Ý kiến khách hàng"
        title="Đánh giá & Nhận xét"
        description="Đánh giá của khách đã mua hiển thị ngay trên storefront; hậu kiểm ở đây là ẩn đánh giá vi phạm hoặc khôi phục lại."
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
            icon: <EyeInvisibleOutlined />,
            tone: 'orange',
          },
          {
            key: 'rating',
            label: 'Điểm trung bình',
            value: `${metrics.averageRating} / 5`,
            icon: <StarOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <FilterBar
            actions={
              <>
                <RefreshButton onRefresh={query.refetch} loading={query.isFetching} />
                <Button
                  icon={<SettingOutlined />}
                  onClick={columnVisibility.open}
                  className="text-slate-600"
                >
                  Tuỳ chỉnh cột
                </Button>
              </>
            }
          >
            <Select
              allowClear
              className="min-w-48"
              value={statusFilter}
              onChange={(value?: string) => url.patch({ status: value, page: undefined })}
              placeholder="Trạng thái"
              options={REVIEW_STATUS_OPTIONS}
            />
          </FilterBar>
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
                ? 'Chọn đánh giá trong bảng để hậu kiểm'
                : `Đã chọn ${selectedIds.length} đánh giá`}
            </span>
            <Space size="small">
              <Popconfirm
                title={`Khôi phục hiển thị ${approvable.length} đánh giá?`}
                description="Các đánh giá này sẽ hiển thị công khai trên trang sản phẩm."
                disabled={approvable.length === 0 || working}
                onConfirm={() => void runBulk('RESTORE')}
              >
                <Button
                  type="primary"
                  ghost
                  icon={<CheckOutlined />}
                  disabled={approvable.length === 0 || working}
                  loading={moderate.isPending}
                >
                  Khôi phục{approvable.length > 0 ? ` (${approvable.length})` : ''}
                </Button>
              </Popconfirm>
              <Popconfirm
                title={`Ẩn ${hideable.length} đánh giá?`}
                description="Đánh giá vẫn được lưu để truy vết nhưng không hiển thị trên website."
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
          dataSource={visibleItems}
          scroll={{ x: 980 }}
          pagination={{
            current: page,
            pageSize: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
            showSizeChanger: false,
            onChange: (next) => url.set('page', next === 1 ? undefined : next),
          }}
          columns={columns}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys.map(String)),
          }}
        />

        <ColumnSettingsModal {...columnVisibility.modalProps} columns={REVIEW_COLUMN_ITEMS} />
      </ManagementPage>

      <ReviewDetailDrawer
        review={detail}
        onClose={() => setDetail(undefined)}
        onReviewUpdated={(updated) => {
          setDetail(updated);
          // CACHE: phản hồi làm thay đổi số comment trên list và version dùng cho lệnh kế tiếp.
          void queryClient.invalidateQueries({ queryKey: getListAdminReviewsQueryKey() });
        }}
      />
    </PageTransition>
  );
}
