import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Form, Input, Select } from 'antd';
import { useEffect, useState } from 'react';
import {
  createAdminPost,
  getListAdminPostsQueryKey,
  updateAdminPost,
} from '@/generated/api/content/content';
import type { ContentPostDto } from '@/generated/api/content/content.schemas';
import {
  ContentPostType,
  type ContentPostType as PostType,
} from '@/generated/api/content/content.schemas';
import { ImageUploadField } from '@/features/media';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { getApiErrorMessage } from '@/lib/api/error';

export function ContentEditorDrawer({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  /** Bỏ trống là soạn bài mới; có giá trị là sửa bài đã đăng. */
  editing?: ContentPostDto;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState<PostType>(ContentPostType.NEWS);
  const [excerpt, setExcerpt] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [relatedProducts, setRelatedProducts] = useState('');
  const [body, setBody] = useState('');
  // Đổ lại form mỗi lần mở: mở sửa bài khác mà giữ state cũ sẽ ghi đè nhầm nội dung.
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? '');
    setPostType((editing?.postType as PostType) ?? ContentPostType.NEWS);
    setExcerpt(editing?.excerpt ?? '');
    setCoverUrl(editing?.coverUrl ?? '');
    setRelatedProducts((editing?.relatedProductSlugs ?? []).join(', '));
    setBody(editing?.body ?? '');
  }, [open, editing]);

  const savePost = useMutation({
    mutationFn: (payload: {
      title: string;
      postType: PostType;
      excerpt: string;
      coverUrl: string;
      body: string;
      relatedProductSlugs: string[];
    }) =>
      editing
        ? updateAdminPost(editing.id, { ...payload, expectedVersion: editing.version })
        : createAdminPost(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
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
      coverUrl: coverUrl.trim(),
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
          onClick={submit}
        >
          Tạo và xuất bản
        </Button>
      }
    >
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
          <ImageUploadField value={coverUrl} onChange={setCoverUrl} />
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
    </Drawer>
  );
}
