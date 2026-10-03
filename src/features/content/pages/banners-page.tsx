import { useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  EditOutlined,
  InboxOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { Button, Image, Input, Select, Tag, Tooltip } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { useListAdminBanners } from '@/generated/api/content/content';
import {
  BannerPlacement,
  BannerStatus,
  type BannerDto,
} from '@/generated/api/content/content.schemas';
import { formatDateTime } from '@/lib/format/datetime';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { BannerEditorDrawer } from '../components/banner-editor-drawer';
import { BannerStatusModal } from '../components/banner-status-modal';
import {
  BANNER_LIMITS,
  BANNER_PAGE_SIZE,
  BANNER_PERMISSION,
  bannerPlacementLabels,
  bannerPlacementOptions,
  bannerStatusOptions,
  bannerStatusPresentation,
} from '../constants/banner.constants';
import { availableBannerActions, type BannerAction } from '../model/banner-actions.policy';
import { IMAGE_FALLBACK_SRC } from '@/features/media';

function parseEnum<T extends string>(values: Record<string, T>, value: string | null): T | undefined {
  return value && value in values ? (value as T) : undefined;
}

const ACTION_BUTTON: Record<BannerAction, { label: string; icon: ReactNode; danger?: boolean }> = {
  publish: { label: 'Xuất bản', icon: <CloudUploadOutlined /> },
  unpublish: { label: 'Gỡ về nháp', icon: <VerticalAlignBottomOutlined /> },
  archive: { label: 'Lưu trữ', icon: <InboxOutlined />, danger: true },
};

function scheduleText(row: BannerDto) {
  if (!row.startsAt && !row.endsAt) return 'Không giới hạn';
  return `${row.startsAt ? formatDateTime(row.startsAt) : 'Ngay khi xuất bản'} → ${
    row.endsAt ? formatDateTime(row.endsAt) : 'Không hết hạn'
  }`;
}

/**
 * Quản lý banner storefront (CMS-02). Vị trí/trạng thái nằm trên URL để gửi link và F5 không mất bộ lọc;
 * ô tìm kiếm debounce và chỉ sống trong màn. Phân trang/lọc chạy ở server.
 */
export function BannersPage() {
  const [params, setParams] = useSearchParams();
  const placement = parseEnum(BannerPlacement, params.get('placement'));
  const status = parseEnum(BannerStatus, params.get('status'));
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [page, setPage] = useListPageReset([debouncedSearch, placement, status]);
  const [editor, setEditor] = useState<{ open: boolean; bannerId?: string }>({ open: false });
  const [pendingAction, setPendingAction] = useState<{ id: string; action: BannerAction }>();
  const canManage = useCan(BANNER_PERMISSION.MANAGE);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useListAdminBanners(
    { page, limit: BANNER_PAGE_SIZE, placement, status, search: debouncedSearch || undefined },
    { query: { retry: false } },
  );
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const total = list.data?.meta.total ?? 0;
  const liveOnPage = rows.filter((row) => row.isLive).length;
  // CONCURRENCY: modal đọc banner từ danh sách hiện tại để sau khi tải lại (lỗi stale) dùng version mới.
  const actionBanner = pendingAction ? rows.find((row) => row.id === pendingAction.id) : undefined;

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị nội dung CMS"
        title="Banner"
        description="Banner trang chủ, thẻ khuyến mãi, chân trang và đầu trang danh mục trên storefront."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                aria-label="Làm mới"
                loading={list.isFetching}
                onClick={() => void list.refetch()}
              />
            </Tooltip>
            <PermissionGate permission={BANNER_PERMISSION.MANAGE}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ open: true })}>
                Tạo banner
              </Button>
            </PermissionGate>
          </div>
        )}
        metrics={[
          { key: 'total', label: 'Banner khớp bộ lọc', value: total, icon: <PictureOutlined />, tone: 'blue' },
          {
            key: 'live',
            label: 'Đang hiển thị (trang này)',
            value: liveOnPage,
            icon: <CheckCircleOutlined />,
            tone: 'green',
          },
        ]}
        filters={(
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              maxLength={BANNER_LIMITS.SEARCH_MAX}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã hoặc tiêu đề banner"
            />
            <Select
              allowClear
              className="min-w-56"
              value={placement}
              onChange={(value?: string) => updateParam('placement', value)}
              placeholder="Vị trí"
              options={bannerPlacementOptions}
            />
            <Select
              allowClear
              className="min-w-40"
              value={status}
              onChange={(value?: string) => updateParam('status', value)}
              placeholder="Trạng thái"
              options={bannerStatusOptions}
            />
          </div>
        )}
      >
        {list.isError && (
          <QueryErrorAlert error={list.error} message="Không tải được danh sách banner" retry={() => void list.refetch()} />
        )}
        <AdminTable
          rowKey="id"
          loading={list.isLoading}
          dataSource={rows}
          scroll={{ x: 1080 }}
          locale={{ emptyText: 'Chưa có banner phù hợp bộ lọc.' }}
          pagination={{
            current: page,
            pageSize: BANNER_PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (value) => `${value} banner`,
            onChange: setPage,
          }}
          columns={[
            {
              title: 'Banner',
              key: 'banner',
              render: (_: unknown, row: BannerDto) => (
                <div className="flex items-center gap-3">
                  <Image
                    fallback={IMAGE_FALLBACK_SRC}
                    width={96}
                    height={40}
                    src={row.desktopImageUrl}
                    alt={row.title ?? row.code}
                    className="rounded-md border border-slate-200 object-cover"
                  />
                  <div className="min-w-0">
                    <strong className="block truncate text-xs text-slate-800">{row.title || 'Không có tiêu đề'}</strong>
                    <div className="font-mono text-[11px] text-slate-400">{row.code}</div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Vị trí',
              key: 'placement',
              width: 200,
              render: (_: unknown, row: BannerDto) => (
                <div className="text-xs text-slate-600">
                  <div>{bannerPlacementLabels[row.placement]}</div>
                  {row.placement === BannerPlacement.CATEGORY_TOP && (
                    <div className="text-slate-400">{row.categoryName ?? 'Mọi danh mục'}</div>
                  )}
                </div>
              ),
            },
            {
              title: 'Khung thời gian',
              key: 'schedule',
              width: 260,
              render: (_: unknown, row: BannerDto) => <span className="text-xs text-slate-600">{scheduleText(row)}</span>,
            },
            { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80, align: 'center' as const },
            {
              title: 'Trạng thái',
              key: 'status',
              width: 170,
              render: (_: unknown, row: BannerDto) => (
                <div className="flex flex-wrap items-center gap-1">
                  <StatusTag status={row.status} presentations={bannerStatusPresentation} />
                  {/* UX: PUBLISHED mà ngoài khung giờ thì không hiển thị — cờ isLive do API tính. */}
                  {row.status === BannerStatus.PUBLISHED && (
                    <Tag color={row.isLive ? 'green' : 'default'} bordered={false}>
                      {row.isLive ? 'Đang chạy' : 'Ngoài khung giờ'}
                    </Tag>
                  )}
                </div>
              ),
            },
            {
              title: '',
              key: 'actions',
              width: 150,
              align: 'right' as const,
              render: (_: unknown, row: BannerDto) =>
                canManage ? (
                  <TableActions>
                    <TableActionButton
                      label={`Sửa banner ${row.code}`}
                      icon={<EditOutlined />}
                      // Banner đã lưu trữ là trạng thái cuối; API cũng trả 409 CMS_BANNER_ARCHIVED.
                      disabled={row.status === BannerStatus.ARCHIVED}
                      onClick={() => setEditor({ open: true, bannerId: row.id })}
                    />
                    {availableBannerActions(row.status).map((action) => (
                      <TableActionButton
                        key={action}
                        label={ACTION_BUTTON[action].label}
                        icon={ACTION_BUTTON[action].icon}
                        danger={ACTION_BUTTON[action].danger}
                        onClick={() => setPendingAction({ id: row.id, action })}
                      />
                    ))}
                  </TableActions>
                ) : null,
            },
          ]}
        />
      </ManagementPage>
      {editor.open && (
        <BannerEditorDrawer
          open={editor.open}
          bannerId={editor.bannerId}
          onClose={() => setEditor({ open: false })}
        />
      )}
      <BannerStatusModal
        banner={actionBanner}
        action={actionBanner ? pendingAction?.action : undefined}
        onClose={() => setPendingAction(undefined)}
      />
    </PageTransition>
  );
}
