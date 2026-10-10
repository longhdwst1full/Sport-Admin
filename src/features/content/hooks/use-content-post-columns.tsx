import { DeleteOutlined, EditOutlined, EyeOutlined, FacebookOutlined, GlobalOutlined, TikTokOutlined } from '@ant-design/icons';
import { Popconfirm, Switch, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { col, TableActionButton } from '@/foundation/table';
import {
  AnyContentPostType,
  ContentPostStatus,
  type SocialPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import { formatDate } from '@/lib/format/datetime';
import { FacebookCell, TikTokCell } from '../components/content-post-cells';
import { SocialChannelIcons } from '../components/social-channel-icons';
import { SocialPostTitleCell } from '../components/social-post-title-cell';
import { SOCIAL_ACTION_BUTTON } from '../constants/social-action-buttons';
import {
  contentPostStatusPresentation,
  postTypeLabels,
  TIKTOK_ENABLED,
} from '../constants/social.constants';
import { availableSocialActions } from '../model/social-actions.policy';
import { formatMetric } from '../model/social-dashboard';
import { POST_CHANNEL, postChannels, socialChannels } from '../model/social-post-filters';
import type { SocialEditorTarget } from '../components/social-post-editor-drawer';

type Row = SocialPostSummaryDto;

const CHANNEL_TAG = {
  [POST_CHANNEL.WEBSITE]: { label: 'Website', color: 'geekblue', icon: <GlobalOutlined /> },
  [POST_CHANNEL.FACEBOOK]: { label: 'Facebook', color: 'blue', icon: <FacebookOutlined /> },
  [POST_CHANNEL.TIKTOK]: { label: 'TikTok', color: undefined, icon: <TikTokOutlined /> },
} as const;

/** Cột không phụ thuộc quyền/handler. */
const CHANNELS_COLUMN = col.text<Row>('id', 'Kênh', {
  key: 'channels',
  width: 90,
  align: 'center',
  render: (_: unknown, row: Row) => <SocialChannelIcons channels={socialChannels(row)} />,
});

const POST_TYPE_COLUMN = col.text<Row>('postType', 'Loại bài', {
  width: 150,
  render: (value: AnyContentPostType) => (
    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {postTypeLabels[value]}
    </span>
  ),
});

const WEBSITE_COLUMN = col.status<Row, ContentPostStatus>('status', 'Website', contentPostStatusPresentation, {
  key: 'website',
  render: (_: unknown, row: Row) =>
    row.postType === AnyContentPostType.SOCIAL ? (
      <span className="text-xs text-slate-400">Không đăng web</span>
    ) : (
      <div className="flex flex-col gap-1">
        <StatusTag status={row.status} presentations={contentPostStatusPresentation} />
        <span className="text-[11px] text-slate-500">{formatDate(row.publishedAt)}</span>
      </div>
    ),
});

const FACEBOOK_COLUMN = col.text<Row>('facebook', 'Facebook', {
  width: 190,
  render: (_: unknown, row: Row) => <FacebookCell row={row} />,
});

const TIKTOK_COLUMNS: ColumnsType<Row> = TIKTOK_ENABLED
  ? [col.text<Row>('tiktok', 'TikTok', { width: 200, render: (_: unknown, row: Row) => <TikTokCell row={row} /> })]
  : [];

const METRIC_COLUMNS: ColumnsType<Row> = [
  col.number<Row>('facebook', 'Tiếp cận', {
    key: 'reach',
    width: 100,
    render: (_: unknown, row: Row) => <span className="text-xs">{formatMetric(row.facebook?.metrics.reach)}</span>,
  }),
  col.number<Row>('facebook', 'Tương tác', {
    key: 'engagements',
    width: 100,
    render: (_: unknown, row: Row) => (
      <Tooltip title="Cảm xúc + bình luận + chia sẻ">
        <span className="text-xs">{formatMetric(row.facebook?.metrics.engagements)}</span>
      </Tooltip>
    ),
  }),
];

export interface ContentPostColumnHandlers {
  canManageWebsite: boolean;
  canManageSocial: boolean;
  canPublishSocial: boolean;
  openDetail: (id: string) => void;
  openSocialEditor: (target: SocialEditorTarget) => void;
  openWebsiteEditor: (row: Row) => void;
  deleteSocial: (row: Row) => void;
  toggleVisibility: (row: Row, next: boolean) => void;
  archive: (row: Row) => void;
  /** Id bài đang chạy lệnh ẩn/hiện hoặc lưu trữ — hiện loading đúng hàng. */
  togglingId?: string;
  archivingId?: string;
}

/**
 * Cột bảng bài viết. Ở hàng chỉ có lệnh mở drawer soạn + Xoá (modal xác nhận); lệnh duyệt/đăng nằm ở chi tiết.
 * PERMISSION: nút theo quyền website/mạng xã hội; API kiểm lại ở mọi lệnh.
 */
export function useContentPostColumns(handlers: ContentPostColumnHandlers): ColumnsType<Row> {
  const {
    canManageWebsite,
    canManageSocial,
    canPublishSocial,
    openDetail,
    openSocialEditor,
    openWebsiteEditor,
    deleteSocial,
    toggleVisibility,
    archive,
    togglingId,
    archivingId,
  } = handlers;

  return useMemo<ColumnsType<Row>>(
    () => [
      {
        title: 'Bài viết',
        key: 'title',
        render: (_: unknown, row: Row) => (
          <SocialPostTitleCell title={row.title} imageUrl={row.coverUrl} onOpen={() => openDetail(row.id)}>
            <div className="mt-1 flex flex-wrap gap-1">
              {postChannels(row).map((channel) => (
                <Tag key={channel} bordered={false} color={CHANNEL_TAG[channel].color} icon={CHANNEL_TAG[channel].icon}>
                  {CHANNEL_TAG[channel].label}
                </Tag>
              ))}
            </div>
          </SocialPostTitleCell>
        ),
      },
      CHANNELS_COLUMN,
      POST_TYPE_COLUMN,
      WEBSITE_COLUMN,
      FACEBOOK_COLUMN,
      ...TIKTOK_COLUMNS,
      ...METRIC_COLUMNS,
      {
        title: 'Hiện trên web',
        key: 'isPublished',
        align: 'center',
        width: 110,
        render: (_: unknown, row: Row) =>
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
                  loading={togglingId === row.id}
                  onChange={(next) => toggleVisibility(row, next)}
                />
              </span>
            </Tooltip>
          ),
      },
      col.actions<Row>(
        (row) => {
          const available = availableSocialActions({
            postType: row.postType,
            postStatus: row.status,
            fbStatus: row.facebook?.status ?? null,
            canManage: canManageSocial,
            canPublish: canPublishSocial,
          });
          const quick = available.filter(({ action }) => action === 'createDraft' || action === 'editDraft');
          const canDeleteFacebook = available.some(({ action }) => action === 'delete');
          // Bài đã lưu trữ không còn hiển thị trên website; Backend cũng từ chối sửa.
          const archived = row.status === ContentPostStatus.ARCHIVED;
          return (
            <>
              <TableActionButton label={`Chi tiết ${row.title}`} icon={<EyeOutlined />} onClick={() => openDetail(row.id)} />
              {quick.map(({ action }) => (
                <TableActionButton
                  key={action}
                  label={SOCIAL_ACTION_BUTTON[action].label}
                  icon={SOCIAL_ACTION_BUTTON[action].icon}
                  onClick={() =>
                    openSocialEditor(
                      action === 'createDraft'
                        ? { mode: 'createDraft', postId: row.id, version: row.version, title: row.title, postType: row.postType }
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
                  onClick={() => deleteSocial(row)}
                />
              )}
              {row.postType !== AnyContentPostType.SOCIAL && (
                <PermissionGate permission="cms.content.manage">
                  <TableActionButton
                    label={`Sửa bài ${row.title}`}
                    icon={<EditOutlined />}
                    disabled={archived}
                    onClick={() => openWebsiteEditor(row)}
                  />
                  <Popconfirm
                    title="Lưu trữ bài viết này?"
                    description="Bài viết sẽ được lưu trữ và không còn hiển thị trên website."
                    okText="Lưu trữ"
                    cancelText="Huỷ"
                    okButtonProps={{ danger: true }}
                    disabled={archived}
                    onConfirm={() => archive(row)}
                  >
                    <TableActionButton
                      label={`Lưu trữ bài ${row.title}`}
                      danger
                      icon={<DeleteOutlined />}
                      disabled={archived}
                      loading={archivingId === row.id}
                    />
                  </Popconfirm>
                </PermissionGate>
              )}
            </>
          );
        },
        { title: '', width: 200, fixed: undefined },
      ),
    ],
    [
      canManageWebsite,
      canManageSocial,
      canPublishSocial,
      openDetail,
      openSocialEditor,
      openWebsiteEditor,
      deleteSocial,
      toggleVisibility,
      archive,
      togglingId,
      archivingId,
    ],
  );
}
