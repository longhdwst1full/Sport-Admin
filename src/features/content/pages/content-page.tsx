import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FacebookOutlined,
  FileTextOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, DatePicker, Dropdown, Input, Popconfirm, Select, Skeleton, Switch, Tabs, Tag, Tooltip } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { PageTransition } from '@/foundation/layout/page-transition';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import {
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  updateAdminPost,
  useDeleteAdminPost,
  useListAdminSocialPosts,
} from '@/generated/api/content/content';
import {
  AnyContentPostType,
  ContentPostStatus,
  type SocialPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDate, formatDateTime } from '@/lib/format/datetime';
import { SocialActionModal } from '../components/social-action-modal';
import { SocialPostDetailDrawer } from '../components/social-post-detail-drawer';
import { SocialPostEditorDrawer, type SocialEditorTarget } from '../components/social-post-editor-drawer';
import { FacebookSettingsHint } from '../components/facebook-settings-hint';
import { SOCIAL_ACTION_BUTTON } from '../constants/social-action-buttons';
import {
  CONTENT_TAB,
  contentTabs,
  fbOriginLabels,
  fbOriginOptions,
  fbPublishTypeLabels,
  fbStatusOptions,
  fbStatusPresentation,
  postTypeLabels,
  postTypeOptions,
  SOCIAL_LIMITS,
  SOCIAL_PAGE_SIZE,
  SOCIAL_PERMISSION,
} from '../constants/social.constants';
import { availableSocialActions, needsAttention } from '../model/social-actions.policy';
import { isFacebookNotConfigured } from '../model/social-command-error';
import { POST_CHANNEL, parseSocialFilters, postChannels, toSocialListParams } from '../model/social-post-filters';

const ContentEditorDrawer = lazy(() =>
  import('../components/content-editor-drawer').then((module) => ({ default: module.ContentEditorDrawer })),
);

const POST_STATUSES = {
  PUBLISHED: { color: 'green', label: 'Đang xuất bản' },
  ARCHIVED: { color: 'default', label: 'Đã lưu trữ' },
  DRAFT: { color: 'gold', label: 'Bản nháp' },
};

const metric = (value: number | null | undefined) => (value == null ? '—' : value.toLocaleString('vi-VN'));

/**
 * Màn bài viết: tab "Tất cả" (bài website + bài chỉ Facebook) và "Facebook" (bài có bản đăng Facebook).
 * Tab và bộ lọc nằm trên URL; ô tìm kiếm debounce. Phân trang/lọc chạy ở server (`listAdminSocialPosts`).
 * Hành động trên bài website (sửa, ẩn/hiện, lưu trữ) giữ như cũ; lệnh Facebook nằm ở drawer chi tiết
 * (kèm modal xác nhận đăng/hẹn giờ).
 */
export function ContentPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filters = parseSocialFilters(params);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [page, setPage] = useListPageReset([
    debouncedSearch,
    filters.tab,
    filters.fbStatus,
    filters.postType,
    filters.origin,
    filters.from,
    filters.to,
  ]);
  const [websiteEditor, setWebsiteEditor] = useState<{ open: boolean; post?: SocialPostSummaryDto }>({ open: false });
  const [socialEditor, setSocialEditor] = useState<SocialEditorTarget>();
  const [detailId, setDetailId] = useState<string>();
  const [socialDeleteRow, setSocialDeleteRow] = useState<SocialPostSummaryDto>();
  const canManageWebsite = useCan('cms.content.manage');
  const canManageSocial = useCan(SOCIAL_PERMISSION.MANAGE);
  const canPublishSocial = useCan(SOCIAL_PERMISSION.PUBLISH);

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const list = useListAdminSocialPosts(
    toSocialListParams(filters, { page, limit: SOCIAL_PAGE_SIZE, search: debouncedSearch }),
    { query: { retry: false } },
  );
  const rows = useMemo(() => list.data?.items ?? [], [list.data]);
  const total = list.data?.meta.total ?? 0;
  const pageStats = useMemo(
    () => ({
      facebook: rows.filter((row) => row.facebook).length,
      attention: rows.filter((row) => needsAttention(row.facebook?.status)).length,
      website: rows.filter((row) => row.postType !== AnyContentPostType.SOCIAL && row.isPublished).length,
    }),
    [rows],
  );

  const invalidateLists = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
    ]);

  // Cờ hiển thị tách khỏi trạng thái: ẩn tạm một bài viết không phải lưu trữ nó.
  const visibilityMutation = useMutation({
    mutationFn: ({ row, next }: { row: SocialPostSummaryDto; next: boolean }) =>
      updateAdminPost(row.id, { expectedVersion: row.version, isPublished: next }),
    onSuccess: async (_result, { next }) => {
      await invalidateLists();
      void message.success(next ? 'Đã hiện bài viết trên website' : 'Đã ẩn bài viết khỏi website');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const deletePost = useDeleteAdminPost({
    mutation: {
      onSuccess: async () => {
        await invalidateLists();
        void message.success('Đã lưu trữ bài viết và gỡ khỏi website.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể xóa bài viết.')),
    },
  });

  const createItems = [
    ...(canManageWebsite ? [{ key: 'website', icon: <GlobalOutlined />, label: 'Bài viết website' }] : []),
    ...(canManageSocial ? [{ key: 'social', icon: <FacebookOutlined />, label: 'Bài chỉ đăng Facebook' }] : []),
  ];

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị nội dung CMS"
        title="Bài viết & Tin tức"
        description="Soạn thảo, quản lý bài viết trên storefront và bài đăng Facebook Page."
        actions={
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void list.refetch()}
                loading={list.isFetching}
                aria-label="Làm mới"
              />
            </Tooltip>
            {createItems.length > 0 && (
              <Dropdown
                menu={{
                  items: createItems,
                  onClick: ({ key }) => {
                    if (key === 'website') setWebsiteEditor({ open: true });
                    else setSocialEditor({ mode: 'createSocial' });
                  },
                }}
              >
                <Button type="primary" icon={<PlusOutlined />}>
                  Soạn bài viết
                </Button>
              </Dropdown>
            )}
          </div>
        }
        metrics={[
          { key: 'total', label: 'Bài khớp bộ lọc', value: total, icon: <FileTextOutlined />, tone: 'blue' },
          {
            key: 'website',
            label: 'Đang hiện trên web (trang này)',
            value: pageStats.website,
            icon: <GlobalOutlined />,
            tone: 'green',
          },
          {
            key: 'facebook',
            label: 'Có bản Facebook (trang này)',
            value: pageStats.facebook,
            icon: <FacebookOutlined />,
            tone: 'blue',
          },
          {
            key: 'attention',
            label: 'Lỗi / chưa rõ kết quả (trang này)',
            value: pageStats.attention,
            icon: <WarningOutlined />,
            tone: 'red',
          },
        ]}
        filters={
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input.Search
              allowClear
              className="w-full"
              value={search}
              maxLength={SOCIAL_LIMITS.SEARCH_MAX}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm trong tiêu đề hoặc nội dung"
            />
            <Select
              allowClear
              className="w-full"
              value={filters.fbStatus}
              onChange={(value?: string) => updateParams({ fbStatus: value })}
              placeholder="Trạng thái Facebook"
              options={fbStatusOptions}
            />
            <Select
              allowClear
              className="w-full"
              value={filters.postType}
              onChange={(value?: string) => updateParams({ postType: value })}
              placeholder="Loại bài"
              options={postTypeOptions}
            />
            <Select
              allowClear
              className="w-full"
              value={filters.origin}
              onChange={(value?: string) => updateParams({ origin: value })}
              placeholder="Nguồn"
              options={fbOriginOptions}
            />
            <DatePicker.RangePicker
              className="w-full"
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              allowEmpty={[true, true]}
              value={[filters.from ? dayjs(filters.from) : null, filters.to ? dayjs(filters.to) : null]}
              onChange={(dates) =>
                updateParams({
                  from: dates?.[0]?.format('YYYY-MM-DD'),
                  to: dates?.[1]?.format('YYYY-MM-DD'),
                })
              }
            />
          </div>
        }
      >
        <Tabs
          activeKey={filters.tab}
          items={contentTabs.map((item) => ({ key: item.key, label: item.label }))}
          onChange={(key) => updateParams({ tab: key === CONTENT_TAB.ALL ? undefined : key })}
          className="mb-3"
        />
        {isFacebookNotConfigured(list.error) && <FacebookSettingsHint />}
        {list.isError && !isFacebookNotConfigured(list.error) && (
          <QueryErrorAlert error={list.error} message="Không tải được danh sách bài viết" retry={() => void list.refetch()} />
        )}
        <AdminTable
          rowKey="id"
          loading={list.isLoading}
          dataSource={rows}
          scroll={{ x: 1280 }}
          locale={{ emptyText: 'Chưa có bài viết phù hợp bộ lọc.' }}
          pagination={{
            current: page,
            pageSize: SOCIAL_PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (value) => `${value} bài viết`,
            onChange: setPage,
          }}
          columns={[
            {
              title: 'Bài viết',
              key: 'title',
              render: (_: unknown, row: SocialPostSummaryDto) => (
                <div className="flex items-center gap-3">
                  <Avatar
                    shape="square"
                    size={48}
                    src={row.coverUrl}
                    className="rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200"
                  >
                    {row.title ? row.title.slice(0, 1).toUpperCase() : 'P'}
                  </Avatar>
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="block max-w-[260px] truncate text-left text-xs font-semibold text-slate-800 hover:text-blue-600"
                      onClick={() => setDetailId(row.id)}
                    >
                      {row.title}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {postChannels(row).map((channel) =>
                        channel === POST_CHANNEL.WEBSITE ? (
                          <Tag key={channel} bordered={false} color="geekblue" icon={<GlobalOutlined />}>
                            Website
                          </Tag>
                        ) : (
                          <Tag key={channel} bordered={false} color="blue" icon={<FacebookOutlined />}>
                            Facebook
                          </Tag>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Loại bài',
              dataIndex: 'postType',
              width: 150,
              render: (value: AnyContentPostType) => (
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                  {postTypeLabels[value]}
                </span>
              ),
            },
            {
              title: 'Website',
              key: 'website',
              width: 150,
              render: (_: unknown, row: SocialPostSummaryDto) =>
                row.postType === AnyContentPostType.SOCIAL ? (
                  <span className="text-xs text-slate-400">Không đăng web</span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <StatusTag
                      status={row.status}
                      presentations={POST_STATUSES as Record<string, { label: string; color: string }>}
                    />
                    <span className="text-[11px] text-slate-500">{formatDate(row.publishedAt)}</span>
                  </div>
                ),
            },
            {
              title: 'Facebook',
              key: 'facebook',
              width: 190,
              render: (_: unknown, row: SocialPostSummaryDto) =>
                row.facebook ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusTag status={row.facebook.status} presentations={fbStatusPresentation} />
                      {row.facebook.lastError && (
                        <Tooltip title={row.facebook.lastError}>
                          <WarningOutlined className="text-rose-500" aria-label="Lỗi gần nhất" />
                        </Tooltip>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {fbPublishTypeLabels[row.facebook.publishType]} · {fbOriginLabels[row.facebook.origin]}
                      {row.facebook.publishAt ? ` · ${formatDateTime(row.facebook.publishAt)}` : ''}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Chưa đăng</span>
                ),
            },
            {
              title: 'Tiếp cận',
              key: 'reach',
              width: 100,
              align: 'right' as const,
              render: (_: unknown, row: SocialPostSummaryDto) => (
                <span className="text-xs">{row.facebook ? metric(row.facebook.metrics.reach) : '—'}</span>
              ),
            },
            {
              title: 'Tương tác',
              key: 'engagements',
              width: 100,
              align: 'right' as const,
              render: (_: unknown, row: SocialPostSummaryDto) => (
                <Tooltip title="Cảm xúc + bình luận + chia sẻ">
                  <span className="text-xs">{row.facebook ? metric(row.facebook.metrics.engagements) : '—'}</span>
                </Tooltip>
              ),
            },
            {
              title: 'Hiện trên web',
              key: 'isPublished',
              align: 'center' as const,
              width: 110,
              render: (_: unknown, row: SocialPostSummaryDto) =>
                row.postType === AnyContentPostType.SOCIAL ? null : (
                  <Tooltip
                    title={
                      row.status === ContentPostStatus.PUBLISHED
                        ? 'Bật/tắt hiển thị trên website'
                        : 'Bài đã lưu trữ không hiện trên website'
                    }
                  >
                    <span>
                      <Switch
                        size="small"
                        checked={row.isPublished}
                        disabled={!canManageWebsite || row.status !== ContentPostStatus.PUBLISHED}
                        loading={visibilityMutation.isPending && visibilityMutation.variables?.row.id === row.id}
                        onChange={(next) => visibilityMutation.mutate({ row, next })}
                      />
                    </span>
                  </Tooltip>
                ),
            },
            {
              title: '',
              key: 'actions',
              width: 200,
              align: 'right' as const,
              render: (_: unknown, row: SocialPostSummaryDto) => {
                const isSocial = row.postType === AnyContentPostType.SOCIAL;
                // Ở hàng: lệnh mở drawer soạn + Xoá (modal xác nhận); lệnh duyệt/đăng nằm ở chi tiết.
                const available = availableSocialActions({
                  postType: row.postType,
                  postStatus: row.status,
                  fbStatus: row.facebook?.status ?? null,
                  canManage: canManageSocial,
                  canPublish: canPublishSocial,
                });
                const quick = available.filter(({ action }) => action === 'createDraft' || action === 'editDraft');
                const canDeleteFacebook = available.some(({ action }) => action === 'delete');
                return (
                  <TableActions>
                    <TableActionButton label={`Chi tiết ${row.title}`} icon={<EyeOutlined />} onClick={() => setDetailId(row.id)} />
                    {quick.map(({ action }) => (
                      <TableActionButton
                        key={action}
                        label={SOCIAL_ACTION_BUTTON[action].label}
                        icon={SOCIAL_ACTION_BUTTON[action].icon}
                        onClick={() =>
                          setSocialEditor(
                            action === 'createDraft'
                              ? { mode: 'createDraft', postId: row.id, version: row.version, title: row.title }
                              : { mode: 'updateDraft', postId: row.id },
                          )
                        }
                      />
                    ))}
                    {canDeleteFacebook && (
                      <TableActionButton
                        label={`Xoá bài Facebook ${row.title}`}
                        icon={SOCIAL_ACTION_BUTTON.delete.icon}
                        danger
                        onClick={() => setSocialDeleteRow(row)}
                      />
                    )}
                    {!isSocial && (
                      <PermissionGate permission="cms.content.manage">
                        <TableActionButton
                          label={`Sửa bài ${row.title}`}
                          icon={<EditOutlined />}
                          // Bài đã lưu trữ không còn hiển thị trên website; Backend cũng từ chối sửa.
                          disabled={row.status === ContentPostStatus.ARCHIVED}
                          onClick={() => setWebsiteEditor({ open: true, post: row })}
                        />
                        <Popconfirm
                          title="Xóa bài viết này?"
                          description="Bài viết sẽ được lưu trữ và không còn hiển thị trên website."
                          disabled={row.status === ContentPostStatus.ARCHIVED}
                          onConfirm={() =>
                            deletePost.mutate({
                              id: row.id,
                              data: { expectedVersion: row.version, reason: 'Lưu trữ theo yêu cầu quản trị' },
                            })
                          }
                        >
                          <TableActionButton
                            label={`Lưu trữ bài ${row.title}`}
                            danger
                            icon={<DeleteOutlined />}
                            disabled={row.status === ContentPostStatus.ARCHIVED}
                            loading={deletePost.isPending && deletePost.variables?.id === row.id}
                          />
                        </Popconfirm>
                      </PermissionGate>
                    )}
                  </TableActions>
                );
              },
            },
          ]}
        />

        {websiteEditor.open && (
          <Suspense fallback={<Skeleton active />}>
            <ContentEditorDrawer
              open={websiteEditor.open}
              editing={websiteEditor.post}
              onClose={() => setWebsiteEditor({ open: false })}
            />
          </Suspense>
        )}
        {socialEditor && <SocialPostEditorDrawer target={socialEditor} onClose={() => setSocialEditor(undefined)} />}
        {detailId && <SocialPostDetailDrawer postId={detailId} onClose={() => setDetailId(undefined)} />}
        <SocialActionModal
          post={socialDeleteRow}
          action={socialDeleteRow ? 'delete' : undefined}
          onClose={() => setSocialDeleteRow(undefined)}
        />
      </ManagementPage>
    </PageTransition>
  );
}
