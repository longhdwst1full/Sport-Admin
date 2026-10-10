import { FacebookOutlined, FileTextOutlined, GlobalOutlined, PlusOutlined, ShareAltOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Dropdown, Segmented, Tabs, Tooltip } from 'antd';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage } from '@/foundation/management';
import { AdminTable, RefreshButton } from '@/foundation/table';
import type { SocialPostSummaryDto } from '@/generated/api/content/content.schemas';
import { ContentPostFilters } from '../components/content-post-filters';
import { FacebookSettingsHint } from '../components/facebook-settings-hint';
import { SocialActionModal } from '../components/social-action-modal';
import { SocialPostDetailDrawer } from '../components/social-post-detail-drawer';
import { SocialPostEditorDrawer, type SocialEditorTarget } from '../components/social-post-editor-drawer';
import { SocialSyncButton } from '../components/social-sync-button';
import { TikTokAccountCard } from '../components/tiktok-account-card';
import {
  CONTENT_TAB,
  contentTabs,
  isSocialChannelEnabled,
  SOCIAL_CHANNEL,
  SOCIAL_PERMISSION,
  socialChannelLabels,
  TIKTOK_DISABLED_HINT,
  TIKTOK_ENABLED,
} from '../constants/social.constants';
import { useContentPostColumns } from '../hooks/use-content-post-columns';
import { CONTENT_PAGE_SIZE, useContentPosts } from '../hooks/use-content-posts';
import { isFacebookNotConfigured } from '../model/social-command-error';

const ContentEditorDrawer = lazy(() =>
  import('../components/content-editor-drawer').then((module) => ({ default: module.ContentEditorDrawer })),
);

const ALL_CHANNELS = 'all';

/** "Tất cả kênh" + từng kênh; kênh chưa nối API (TikTok) bị khoá kèm tooltip. */
const channelFilterOptions = [
  { value: ALL_CHANNELS, label: 'Tất cả kênh' },
  ...Object.values(SOCIAL_CHANNEL).map((channel) =>
    isSocialChannelEnabled(channel)
      ? { value: channel, label: socialChannelLabels[channel] }
      : {
          value: channel,
          disabled: true,
          label: (
            <Tooltip title={TIKTOK_DISABLED_HINT}>
              <span>{socialChannelLabels[channel]}</span>
            </Tooltip>
          ),
        },
  ),
];

const CREATE_MENU = {
  website: { key: 'website', icon: <GlobalOutlined />, label: 'Bài viết website' },
  social: { key: 'social', icon: <ShareAltOutlined />, label: 'Bài chỉ đăng mạng xã hội' },
};

/**
 * Màn bài viết: tab "Tất cả" (bài website + bài chỉ Facebook) và "Mạng xã hội" (bài có bản đăng mạng xã hội,
 * lọc thêm theo kênh). Tab và bộ lọc nằm trên URL (`?tab=facebook` cũ được đổi sang `social`); ô tìm kiếm
 * debounce. Phân trang/lọc chạy ở server (`listAdminSocialPosts`, xem `useContentPosts`).
 * Hành động trên bài website (sửa, ẩn/hiện, lưu trữ) ở hàng; lệnh Facebook/TikTok nằm ở drawer chi tiết
 * (kèm modal xác nhận đăng/hẹn giờ).
 */
export function ContentPage() {
  const posts = useContentPosts();
  const { filters, updateParams, search, list, visibility, archive } = posts;
  const [websiteEditor, setWebsiteEditor] = useState<{ open: boolean; post?: SocialPostSummaryDto }>({ open: false });
  const [socialEditor, setSocialEditor] = useState<SocialEditorTarget>();
  const [detailId, setDetailId] = useState<string>();
  const [socialDeleteRow, setSocialDeleteRow] = useState<SocialPostSummaryDto>();
  const canManageWebsite = useCan('cms.content.manage');
  const canManageSocial = useCan(SOCIAL_PERMISSION.MANAGE);
  const canPublishSocial = useCan(SOCIAL_PERMISSION.PUBLISH);
  const socialTab = filters.tab === CONTENT_TAB.SOCIAL;

  const { mutate: mutateVisibility } = visibility;
  const { mutate: mutateArchive } = archive;
  const toggleVisibility = useCallback(
    (row: SocialPostSummaryDto, next: boolean) => mutateVisibility({ row, next }),
    [mutateVisibility],
  );
  const archivePost = useCallback(
    (row: SocialPostSummaryDto) =>
      mutateArchive({ id: row.id, data: { expectedVersion: row.version, reason: 'Lưu trữ theo yêu cầu quản trị' } }),
    [mutateArchive],
  );
  const openWebsiteEditor = useCallback((post: SocialPostSummaryDto) => setWebsiteEditor({ open: true, post }), []);

  const columns = useContentPostColumns({
    canManageWebsite,
    canManageSocial,
    canPublishSocial,
    openDetail: setDetailId,
    openSocialEditor: setSocialEditor,
    openWebsiteEditor,
    deleteSocial: setSocialDeleteRow,
    toggleVisibility,
    archive: archivePost,
    togglingId: visibility.isPending ? visibility.variables?.row.id : undefined,
    archivingId: archive.isPending ? archive.variables?.id : undefined,
  });

  const createItems = [
    ...(canManageWebsite ? [CREATE_MENU.website] : []),
    ...(canManageSocial ? [CREATE_MENU.social] : []),
  ];

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị nội dung CMS"
        title="Bài viết & Tin tức"
        description="Soạn thảo, quản lý bài viết trên storefront và bài đăng Facebook Page, TikTok."
        actions={
          <div className="flex flex-wrap gap-2">
            <RefreshButton onRefresh={list.refetch} loading={list.isFetching} />
            {socialTab && <SocialSyncButton />}
            {createItems.length > 0 && (
              <Dropdown
                menu={{
                  items: createItems,
                  onClick: ({ key }) => {
                    if (key === CREATE_MENU.website.key) setWebsiteEditor({ open: true });
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
          { key: 'total', label: 'Bài khớp bộ lọc', value: posts.total, icon: <FileTextOutlined />, tone: 'blue' },
          {
            key: 'website',
            label: 'Đang hiện trên web (trang này)',
            value: posts.pageStats.website,
            icon: <GlobalOutlined />,
            tone: 'green',
          },
          {
            key: 'facebook',
            label: 'Có bản Facebook (trang này)',
            value: posts.pageStats.facebook,
            icon: <FacebookOutlined />,
            tone: 'blue',
          },
          {
            key: 'attention',
            label: 'Lỗi / chưa rõ kết quả (trang này)',
            value: posts.pageStats.attention,
            icon: <WarningOutlined />,
            tone: 'red',
          },
        ]}
        filters={
          <ContentPostFilters
            filters={filters}
            search={search.value}
            onSearchChange={search.setValue}
            onChange={updateParams}
          />
        }
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Tabs
            activeKey={filters.tab}
            items={contentTabs}
            onChange={(key) => updateParams({ tab: key === CONTENT_TAB.ALL ? undefined : key, channel: undefined })}
            className="min-w-0"
          />
          {socialTab && (
            <div role="group" aria-label="Lọc theo kênh" className="max-w-full overflow-x-auto">
              <Segmented
                size="small"
                value={filters.channel ?? ALL_CHANNELS}
                options={channelFilterOptions}
                onChange={(value) => updateParams({ channel: value === ALL_CHANNELS ? undefined : String(value) })}
              />
            </div>
          )}
        </div>
        {socialTab && TIKTOK_ENABLED && canManageSocial && <TikTokAccountCard />}
        {isFacebookNotConfigured(list.error) && <FacebookSettingsHint />}
        {list.isError && !isFacebookNotConfigured(list.error) && (
          <QueryErrorAlert error={list.error} message="Không tải được danh sách bài viết" retry={() => void list.refetch()} />
        )}
        <AdminTable
          rowKey="id"
          loading={list.isLoading}
          dataSource={posts.rows}
          scroll={{ x: TIKTOK_ENABLED ? 1580 : 1370 }}
          locale={{ emptyText: 'Chưa có bài viết phù hợp bộ lọc.' }}
          pagination={{
            current: posts.page,
            pageSize: CONTENT_PAGE_SIZE,
            total: posts.total,
            showSizeChanger: false,
            showTotal: (value) => `${value} bài viết`,
            onChange: posts.setPage,
          }}
          columns={columns}
        />

        {websiteEditor.open && (
          <Suspense fallback={<DetailSkeleton />}>
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
