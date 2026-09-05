import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Card, Popconfirm, Skeleton, Table, Tag, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import {
  getListAdminPostsQueryKey,
  useDeleteAdminPost,
  useListAdminPosts,
} from '@/generated/api/content/content';
import { getApiErrorMessage } from '@/lib/api/error';

const ContentEditorDrawer = lazy(() =>
  import('./content-editor-drawer').then((module) => ({ default: module.ContentEditorDrawer })),
);

export function ContentPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const query = useListAdminPosts();
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography.Text type="secondary">CMS</Typography.Text>
          <Typography.Title level={2} className="!mb-0 !mt-1">
            Bài viết
          </Typography.Title>
        </div>
        <PermissionGate permission="content.post.manage">
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setEditorOpen(true)}
          >
            Soạn bài viết
          </Button>
        </PermissionGate>
      </div>
      <Card>
        <Table
          rowKey="id"
          loading={query.isPending}
          dataSource={query.data?.items ?? []}
          pagination={false}
          columns={[
            {
              title: 'Bài viết',
              dataIndex: 'title',
              render: (value, row) => (
                <div className="flex items-center gap-3">
                  <Avatar shape="square" size={48} src={row.coverUrl} />
                  <div>
                    <strong>{value}</strong>
                    <div className="text-xs text-gray-500">/{row.slug}</div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Loại',
              dataIndex: 'postType',
              render: (value) => <Tag>{String(value).replaceAll('_', ' ')}</Tag>,
            },
            {
              title: 'Liên quan SP',
              dataIndex: 'relatedProductSlugs',
              render: (value: string[]) => value.length,
            },
            {
              title: 'Xuất bản',
              dataIndex: 'publishedAt',
              render: (value) => new Date(value).toLocaleDateString('vi-VN'),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (value) => (
                <Tag color={value === 'PUBLISHED' ? 'green' : 'default'}>
                  {value === 'PUBLISHED' ? 'Đang xuất bản' : 'Đã lưu trữ'}
                </Tag>
              ),
            },
            {
              title: 'Thao tác',
              key: 'actions',
              align: 'right',
              render: (_, row) => (
                <PermissionGate permission="content.post.manage">
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
                    <Button
                      danger
                      type="link"
                      icon={<DeleteOutlined />}
                      disabled={row.status === 'ARCHIVED'}
                      loading={deletePost.isPending && deletePost.variables?.id === row.id}
                    >
                      Xóa
                    </Button>
                  </Popconfirm>
                </PermissionGate>
              ),
            },
          ]}
        />
      </Card>
      {editorOpen && (
        <Suspense fallback={<Skeleton active />}>
          <ContentEditorDrawer open={editorOpen} onClose={() => setEditorOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
