import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Form, Input, Select } from 'antd';
import { useState } from 'react';
import {
  createAdminPost,
  getGetAdminPostQueryKey,
  getGetAdminSocialPostQueryKey,
  getListAdminPostsQueryKey,
  getListAdminSocialPostsQueryKey,
  updateAdminPost,
  useGetAdminPost,
} from '@/generated/api/content/content';
import {
  ContentPostType,
  type ContentPostDto,
  type ContentPostSummaryDto,
} from '@/generated/api/content/content.schemas';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { ImageUploadField } from '@/features/media';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { getApiErrorMessage } from '@/lib/api/error';
import { postTypeLabels } from '../constants/social.constants';
import { toCoverPayload } from '../model/content-post-cover';
import { FormDrawer } from '@/foundation/overlay';

/** Bài website chỉ nhận các loại trong `ContentPostType` (không có SOCIAL). */
const CONTENT_POST_TYPE_OPTIONS = Object.values(ContentPostType).map((value) => ({
  value,
  label: postTypeLabels[value],
}));

export function ContentEditorDrawer({
  open,
  editing,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** Bỏ trống là soạn bài mới; có giá trị (từ list, chỉ có summary) là sửa bài đã đăng. */
  editing?: Pick<ContentPostSummaryDto, 'id' | 'slug' | 'version'>;
  onClose: () => void;
  /** Gọi sau khi tạo bài mới thành công (list đã invalidate), sau `onClose`. */
  onCreated?: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState<ContentPostType>(ContentPostType.NEWS);
  const [excerpt, setExcerpt] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverAssetId, setCoverAssetId] = useState<string | undefined>();
  const [relatedProducts, setRelatedProducts] = useState('');
  const [body, setBody] = useState('');
  // UX: chỉ hiện lỗi từng ô sau lần bấm lưu đầu tiên, tránh báo đỏ khi vừa mở form.
  const [submitted, setSubmitted] = useState(false);

  // List item không còn có body/relatedProductSlugs (chỉ là summary), nên form sửa bài phải tải
  // lại bản đầy đủ theo id thay vì đọc từ row của bảng.
  const postDetail = useGetAdminPost(editing?.id ?? '', {
    query: { enabled: open && Boolean(editing?.id) },
  });
  const editingFull = editing ? postDetail.data : undefined;

  // Đổ lại form mỗi lần mở/khi bản đầy đủ tải xong: mở sửa bài khác mà giữ state cũ sẽ ghi đè nhầm nội dung;
  // với bài mới thì reset ngay khi drawer mở. Đổ trong lúc render khi nguồn đổi (RULE-HOOK-01) thay cho
  // setState trong effect; query giữ nguyên tham chiếu khi refetch không đổi dữ liệu.
  const source: ContentPostDto | 'new' | undefined = !open ? undefined : editing ? editingFull : 'new';
  const [loadedSource, setLoadedSource] = useState<ContentPostDto | 'new'>();
  if (!open && loadedSource) setLoadedSource(undefined);
  if (source && source !== loadedSource) {
    setLoadedSource(source);
    setSubmitted(false);
    const full = source === 'new' ? undefined : source;
    setTitle(full?.title ?? '');
    setPostType(full?.postType ?? ContentPostType.NEWS);
    setExcerpt(full?.excerpt ?? '');
    setCoverUrl(full?.coverUrl ?? '');
    setCoverAssetId(full?.coverAssetId ?? undefined);
    setRelatedProducts((full?.relatedProductSlugs ?? []).join(', '));
    setBody(full?.body ?? '');
  }

  const savePost = useMutation({
    mutationFn: (payload: {
      title: string;
      postType: ContentPostType;
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
      // Chi tiết cũng invalidate: version đã tăng, mở lại form/drawer trong `staleTime` mà đọc cache cũ sẽ 409.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAdminSocialPostsQueryKey() }),
        ...(editing
          ? [
              queryClient.invalidateQueries({ queryKey: getGetAdminPostQueryKey(editing.id) }),
              queryClient.invalidateQueries({ queryKey: getGetAdminSocialPostQueryKey(editing.id) }),
            ]
          : []),
      ]);
      void message.success(editing ? 'Đã cập nhật bài viết' : 'Đã tạo và xuất bản bài viết');
      onClose();
      if (!editing) onCreated?.();
    },
    onError: (error) =>
      void message.error(
        getApiErrorMessage(error, 'Không lưu được bài viết. Vui lòng kiểm tra lại.'),
      ),
  });

  // CONTRACT: CreateContentPostDto bắt buộc title/postType/excerpt/body; ảnh bìa bắt buộc khi không có coverAssetId.
  const fieldErrors = {
    title: title.trim() ? undefined : 'Nhập tiêu đề',
    excerpt: excerpt.trim() ? undefined : 'Nhập mô tả ngắn',
    cover: coverUrl.trim() ? undefined : 'Chọn ảnh bìa',
    body: body.trim() ? undefined : 'Nhập nội dung',
  };
  const fieldStatus = (error?: string) =>
    submitted && error ? { validateStatus: 'error' as const, help: error } : {};

  const submit = () => {
    setSubmitted(true);
    if (Object.values(fieldErrors).some(Boolean)) {
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
    <FormDrawer
      title={editing ? `Sửa bài viết ${editing.slug}` : 'Soạn bài viết'}
      size="lg"
      open={open}
      onClose={onClose}
      onSubmit={submit}
      submitting={savePost.isPending}
      submitDisabled={Boolean(editing) && !editingFull}
      submitText="Tạo và xuất bản"
    >
      {editing && !editingFull ? (
        <DetailSkeleton />
      ) : (
      <Form layout="vertical">
        <Form.Item label="Tiêu đề" required {...fieldStatus(fieldErrors.title)}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Form.Item>
        {/* Đường dẫn bài viết do backend sinh từ tiêu đề, nên form không hỏi nữa. */}
        <Form.Item label="Loại bài viết" required>
          <Select
            value={postType}
            onChange={setPostType}
            options={CONTENT_POST_TYPE_OPTIONS}
          />
        </Form.Item>
        <Form.Item label="Mô tả ngắn" required {...fieldStatus(fieldErrors.excerpt)}>
          <Input.TextArea
            rows={2}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </Form.Item>
        <Form.Item label="Ảnh bìa" required {...fieldStatus(fieldErrors.cover)}>
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
          {...fieldStatus(fieldErrors.body)}
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
    </FormDrawer>
  );
}
