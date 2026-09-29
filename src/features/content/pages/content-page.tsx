import {
  BookOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { App, Avatar, Button, Popconfirm, Skeleton, Switch, Tooltip } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useMemo, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import { PageTransition } from '@/foundation/layout/page-transition';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import {
  getListAdminPostsQueryKey,
  updateAdminPost,
  useDeleteAdminPost,
  useListAdminPosts,
} from '@/generated/api/content/content';
import type { ContentPostSummaryDto } from '@/generated/api/content/content.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDate } from '@/lib/format/datetime';

const CONTENT_PAGE_SIZE = 10;

const ContentEditorDrawer = lazy(() =>
  import('../components/content-editor-drawer').then((module) => ({ default: module.ContentEditorDrawer })),
);

const POST_STATUSES = {
  PUBLISHED: { color: 'green', label: 'Đang xuất bản' },
  ARCHIVED: { color: 'default', label: 'Đã lưu trữ' },
  DRAFT: { color: 'gold', label: 'Bản nháp' },
};

export function ContentPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPostSummaryDto>();
  // Không có bộ lọc riêng ở màn này; vẫn dùng hook chung để trang tự về 1 nếu sau này thêm filter.
  const [page, setPage] = useListPageReset([]);

  // Cờ hiển thị tách khỏi trạng thái: ẩn tạm một bài viết không phải lưu trữ nó.
  const visibilityMutation = useMutation({
    mutationFn: ({ row, next }: { row: ContentPostSummaryDto; next: boolean }) =>
      updateAdminPost(row.id, { expectedVersion: row.version, isPublished: next }),
    onSuccess: async (_result, { next }) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
      void message.success(next ? 'Đã hiện bài viết trên website' : 'Đã ẩn bài viết khỏi website');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });
  const query = useListAdminPosts({ page, limit: CONTENT_PAGE_SIZE });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const meta = query.data?.meta;

  // total dùng meta (toàn bộ danh sách); published/archived/guides chỉ tính trên trang hiện tại
  // vì list API giờ phân trang server-side, không còn trả toàn bộ item để đếm.
  const metrics = useMemo(() => {
    const total = meta?.total ?? items.length;
    const published = items.filter((i) => i.status === 'PUBLISHED').length;
    const archived = items.filter((i) => i.status === 'ARCHIVED').length;
    const guides = items.filter(
      (i) => i.postType === 'TRAINING_GUIDE' || i.postType === 'PRODUCT_GUIDE',
    ).length;
    return { total, published, archived, guides };
  }, [items, meta]);

  const deletePost = useDeleteAdminPost({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
        void message.success('Đã lưu trữ bài viết và gỡ khỏi website.');
      },
      onError: (error) =>
        void message.error(getApiErrorMessage(error, 'Không thể xóa bài viết.')),
    },
  });

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Quản trị nội dung CMS"
        title="Bài viết & Tin tức"
        description="Soạn thảo, quản lý bài viết hướng dẫn thể thao, câu chuyện thương hiệu và tin tức trên storefront."
        actions={
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void query.refetch()}
                loading={query.isFetching}
                aria-label="Làm mới"
              />
            </Tooltip>
            <PermissionGate permission="cms.content.manage">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingPost(undefined);
                  setEditorOpen(true);
                }}
              >
                Soạn bài viết
              </Button>
            </PermissionGate>
          </div>
        }
        metrics={[
          {
            key: 'total',
            label: 'Tổng bài viết',
            value: metrics.total,
            icon: <FileTextOutlined />,
            tone: 'blue',
          },
          {
            key: 'published',
            label: 'Đang xuất bản (trang này)',
            value: metrics.published,
            icon: <CheckCircleOutlined />,
            tone: 'green',
          },
          {
            key: 'archived',
            label: 'Đã lưu trữ (trang này)',
            value: metrics.archived,
            icon: <InboxOutlined />,
            tone: 'orange',
          },
          {
            key: 'guides',
            label: 'Cẩm nang / Guide (trang này)',
            value: metrics.guides,
            icon: <BookOutlined />,
            tone: 'green',
          },
        ]}
      >
        <AdminTable
          rowKey="id"
          loading={query.isPending}
          dataSource={items}
          scroll={{ x: 920 }}
          pagination={{
            current: page,
            pageSize: CONTENT_PAGE_SIZE,
            total: meta?.total ?? 0,
            showSizeChanger: false,
            showTotal: (value) => `${value} bài viết`,
            onChange: setPage,
          }}
          columns={[
            {
              title: 'Bài viết',
              dataIndex: 'title',
              render: (value: string, row: ContentPostSummaryDto) => (
                <div className="flex items-center gap-3">
                  <Avatar
                    shape="square"
                    size={48}
                    src={row.coverUrl}
                    className="rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200"
                  >
                    {value ? value.slice(0, 1).toUpperCase() : 'P'}
                  </Avatar>
                  <div className="min-w-0">
                    <strong className="text-slate-800 text-xs block truncate">{value}</strong>
                    <div className="text-[11px] text-slate-400 font-mono">/{row.slug}</div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Chuyên mục',
              dataIndex: 'postType',
              width: 140,
              render: (value: string) => (
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                  {String(value).replaceAll('_', ' ')}
                </span>
              ),
            },
            {
              title: 'Ngày xuất bản',
              dataIndex: 'publishedAt',
              width: 150,
              render: (value: string) => (
                <span className="text-xs text-slate-600">
                  {formatDate(value)}
                </span>
              ),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 140,
              render: (value: string) => (
                <StatusTag
                  status={value}
                  presentations={POST_STATUSES as Record<string, { label: string; color: string }>}
                />
              ),
            },
            {
              title: 'Hiện trên web',
              key: 'isPublished',
              align: 'center' as const,
              width: 120,
              render: (_: unknown, row: ContentPostSummaryDto) => (
                <Tooltip
                  title={
                    row.status === 'PUBLISHED'
                      ? 'Bật/tắt hiển thị trên website'
                      : 'Bài đã lưu trữ không hiện trên website'
                  }
                >
                  <span>
                    <Switch
                      size="small"
                      checked={row.isPublished}
                      disabled={row.status !== 'PUBLISHED'}
                      loading={
                        visibilityMutation.isPending &&
                        visibilityMutation.variables?.row.id === row.id
                      }
                      onChange={(next) => visibilityMutation.mutate({ row, next })}
                    />
                  </span>
                </Tooltip>
              ),
            },
            {
              title: '',
              key: 'actions',
              width: 110,
              align: 'right' as const,
              render: (_: unknown, row: ContentPostSummaryDto) => (
                <PermissionGate permission="cms.content.manage">
                  <TableActions>
                  <TableActionButton
                    label={`Sửa bài ${row.title}`}
                    icon={<EditOutlined />}
                    // Bài đã lưu trữ không còn hiển thị trên website; Backend cũng từ chối sửa.
                    disabled={row.status === 'ARCHIVED'}
                    onClick={() => {
                      setEditingPost(row);
                      setEditorOpen(true);
                    }}
                  />
                  <Popconfirm
                    title="Xóa bài viết này?"
                    description="Bài viết sẽ được lưu trữ và không còn hiển thị trên website."
                    disabled={row.status === 'ARCHIVED'}
                    onConfirm={() =>
                      deletePost.mutate({
                        id: row.id,
                        data: {
                          expectedVersion: row.version,
                          reason: 'Lưu trữ theo yêu cầu quản trị',
                        },
                      })
                    }
                  >
                    <TableActionButton
                      label={`Lưu trữ bài ${row.title}`}
                      danger
                      icon={<DeleteOutlined />}
                      disabled={row.status === 'ARCHIVED'}
                      loading={deletePost.isPending && deletePost.variables?.id === row.id}
                    />
                  </Popconfirm>
                  </TableActions>
                </PermissionGate>
              ),
            },
          ]}
        />

        {editorOpen && (
          <Suspense fallback={<Skeleton active />}>
            <ContentEditorDrawer
              open={editorOpen}
              editing={editingPost}
              onClose={() => {
                setEditorOpen(false);
                setEditingPost(undefined);
              }}
            />
          </Suspense>
        )}
      </ManagementPage>
    </PageTransition>
  );
}
