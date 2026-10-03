import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Form, Input, Select, Skeleton } from 'antd';
import { useEffect, useState } from 'react';
import {
  createAdminPost,
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  updateAdminPost,
  useGetAdminPost,
} from '@/generated/api/content/content';
import type { ContentPostSummaryDto } from '@/generated/api/content/content.schemas';
import {
  ContentPostType,
  type ContentPostType as PostType,
} from '@/generated/api/content/content.schemas';
import { ImageUploadField } from '@/features/media';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { getApiErrorMessage } from '@/lib/api/error';
import { toCoverPayload } from '../model/content-post-cover';

export function ContentEditorDrawer({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  /** Bỏ trống là soạn bài mới; có giá trị (từ list, chỉ có summary) là sửa bài đã đăng. */
  editing?: Pick<ContentPostSummaryDto, 'id' | 'slug' | 'version'>;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState<PostType>(ContentPostType.NEWS);
  const [excerpt, setExcerpt] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverAssetId, setCoverAssetId] = useState<string | undefined>();
  const [relatedProducts, setRelatedProducts] = useState('');
  const [body, setBody] = useState('');

  // List item không còn có body/relatedProductSlugs (chỉ là summary), nên form sửa bài phải tải
  // lại bản đầy đủ theo id thay vì đọc từ row của bảng.
  const postDetail = useGetAdminPost(editing?.id ?? '', {
    query: { enabled: open && Boolean(editing?.id) },
  });
  const editingFull = editing ? postDetail.data : undefined;

  // Đổ lại form mỗi lần mở/khi bản đầy đủ tải xong: mở sửa bài khác mà giữ state cũ sẽ ghi đè
  // nhầm nội dung; với bài mới thì reset ngay khi drawer mở.
  useEffect(() => {
    if (!open) return;
    if (editing && !editingFull) return;
    setTitle(editingFull?.title ?? '');
    setPostType((editingFull?.postType as PostType) ?? ContentPostType.NEWS);
    setExcerpt(editingFull?.excerpt ?? '');
    setCoverUrl(editingFull?.coverUrl ?? '');
    setCoverAssetId(editingFull?.coverAssetId ?? undefined);
    setRelatedProducts((editingFull?.relatedProductSlugs ?? []).join(', '));
    setBody(editingFull?.body ?? '');
  }, [open, editing, editingFull]);

  const savePost = useMutation({
    mutationFn: (payload: {
      title: string;
      postType: PostType;
      excerpt: string;
      coverUrl?: string;
      coverAssetId?: string;
      body: string;
      relatedProductSlugs: string[];
    }) =>
      editing
        ? updateAdminPost(editing.id, {
            ...payload,
            // IDEMPOTENCY: dùng version của bản vừa tải (editingFull), không phải version cũ trên
            // row danh sách — tránh optimistic-lock conflict giả khi bài đã đổi version từ lúc mở list.
            expectedVersion: editingFull?.version ?? editing.version,
          })
        : createAdminPost(payload),
    onSuccess: async () => {
      // Màn bài viết đọc danh sách gộp (`listAdminSocialPosts`); vẫn invalidate list website cho màn khác.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
      ]);
      void message.success(editing ? 'Đã cập nhật bài viết' : 'Đã tạo và xuất bản bài viết');
      onClose();
    },
    onError: (error) =>
      void message.error(
        getApiErrorMessage(error, 'Không lưu được bài viết. Vui lòng kiểm tra lại.'),
      ),
  });

  const submit = () => {
    if (!title.trim() || !excerpt.trim() || !coverUrl.trim() || !body.trim()) {
      void message.warning('Điền đủ tiêu đề, mô tả, ảnh và nội dung.');
      return;
    }
    savePost.mutate({
      title: title.trim(),
      postType,
      excerpt: excerpt.trim(),
      ...toCoverPayload({ coverUrl, coverAssetId }, editingFull),
      body,
      relatedProductSlugs: relatedProducts
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    });
  };

  return (
    <Drawer
      title={editing ? `Sửa bài viết ${editing.slug}` : 'Soạn bài viết'}
      width={820}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Button
          type="primary"
          loading={savePost.isPending}
          disabled={Boolean(editing) && !editingFull}
          onClick={submit}
        >
          Tạo và xuất bản
        </Button>
      }
    >
      {editing && !editingFull ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
      <Form layout="vertical">
        <Form.Item label="Tiêu đề" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Form.Item>
        {/* Đường dẫn bài viết do backend sinh từ tiêu đề, nên form không hỏi nữa. */}
        <Form.Item label="Loại bài viết" required>
          <Select
            value={postType}
            onChange={setPostType}
            options={Object.values(ContentPostType).map((value) => ({
              value,
              label: value.replaceAll('_', ' '),
            }))}
          />
        </Form.Item>
        <Form.Item label="Mô tả ngắn" required>
          <Input.TextArea
            rows={2}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </Form.Item>
        <Form.Item label="Ảnh bìa" required>
          <ImageUploadField
            value={coverUrl}
            onChange={(url, assetId) => {
              setCoverUrl(url);
              setCoverAssetId(assetId);
            }}
          />
        </Form.Item>
        <Form.Item label="Slug sản phẩm liên quan" extra="Phân tách bằng dấu phẩy">
          <Input
            value={relatedProducts}
            onChange={(event) => setRelatedProducts(event.target.value)}
          />
        </Form.Item>
        <Form.Item
          label="Nội dung"
          required
          extra="Ảnh trong nội dung dùng công cụ Image tích hợp của CKEditor 4; editor có vùng nhập HTML dự phòng nếu CDN không khả dụng."
        >
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Soạn nội dung bài viết..."
          />
        </Form.Item>
      </Form>
      )}
    </Drawer>
  );
}
