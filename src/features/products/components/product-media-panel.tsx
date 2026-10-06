import { DeleteOutlined, DownOutlined, EditOutlined, StarOutlined, UpOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Form, Image, Input, Modal, Select, Space, Tag, Upload } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useImageUpload } from '@/shared/hooks/use-image-upload';
import {
  useAttachAdminProductMedia,
  useDeleteAdminProductMedia,
  useReorderAdminProductMedia,
  useUpdateAdminProductMedia,
} from '@/generated/api/catalog/catalog';
import type { ProductDetailDto, ProductMediaDto } from '@/generated/api/catalog/catalog.schemas';
import { useCan } from '@/core/auth/permissions';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col, TableActionButton } from '@/foundation/table';
import { uploadImage } from '@/lib/media/upload-image';
import { getApiErrorMessage } from '@/lib/api/error';
import { reorderProductMedia } from '../model/product-media.policy';

export function ProductMediaPanel({
  product,
  onChanged,
}: {
  product: ProductDetailDto;
  onChanged: () => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const [targetVariantId, setTargetVariantId] = useState<string>();
  // SECURITY: thêm ảnh sản phẩm ghi qua media API, cần media.asset.upload ngoài quyền sửa sản phẩm.
  const canUpload = useCan('media.asset.upload');
  const [editing, setEditing] = useState<ProductMediaDto>();
  const [altText, setAltText] = useState('');

  useEffect(() => setAltText(editing?.altText ?? ''), [editing]);
  const mutationError = (error: unknown, fallback: string) =>
    void message.error(getApiErrorMessage(error, fallback));
  const mutationSuccess = async (text: string) => {
    await onChanged();
    void message.success(text);
  };

  // IDEMPOTENCY: gửi lại cùng x-request-id sau khi mất response → API trả danh sách ảnh hiện tại thay vì
  // 409 vì version sản phẩm đã tăng ở lần đầu; sinh id mới sau mỗi lần gắn thành công.
  const attachRequestId = useRef(crypto.randomUUID());
  const attach = useAttachAdminProductMedia({
    request: { headers: { 'x-request-id': attachRequestId.current } },
    mutation: {
      onSuccess: () => {
        attachRequestId.current = crypto.randomUUID();
        return mutationSuccess('Đã gắn ảnh vào sản phẩm.');
      },
      onError: (error) => mutationError(error, 'Không thể gắn ảnh.'),
    },
  });
  // Upload ảnh rồi gắn luôn vào sản phẩm là một thao tác từ góc nhìn người dùng: chỉ báo
  // "đã upload xong" (onSuccess) sau khi cả hai bước cùng thành công.
  const { uploading, customRequest } = useImageUpload((file) =>
    uploadImage(file).then(async (asset) => {
      await attach.mutateAsync({
        id: product.id,
        data: {
          mediaAssetId: asset.id,
          variantId: targetVariantId,
          altText: product.name,
          isPrimary: product.media.length === 0,
          expectedProductVersion: product.version,
        },
      });
      return asset;
    }),
  );
  const update = useUpdateAdminProductMedia({
    mutation: {
      onSuccess: async () => {
        setEditing(undefined);
        await mutationSuccess('Đã cập nhật ảnh.');
      },
      onError: (error) => mutationError(error, 'Không thể cập nhật ảnh.'),
    },
  });
  const reorder = useReorderAdminProductMedia({
    mutation: {
      onSuccess: () => mutationSuccess('Đã cập nhật thứ tự ảnh.'),
      onError: (error) => mutationError(error, 'Không thể sắp xếp ảnh.'),
    },
  });
  const remove = useDeleteAdminProductMedia({
    mutation: {
      onSuccess: () => mutationSuccess('Đã xóa ảnh khỏi sản phẩm và Cloudinary.'),
      onError: async (error) => {
        // CONCURRENCY: BE có thể đã chạy compensation và tăng Product version khi provider lỗi.
        await onChanged();
        mutationError(error, 'Không thể xóa ảnh.');
      },
    },
  });
  const pending = attach.isPending || update.isPending || reorder.isPending || remove.isPending;

  const move = (index: number, direction: -1 | 1) => {
    const items = reorderProductMedia(product.media, index, direction);
    if (!items) return;
    reorder.mutate({
      id: product.id,
      data: {
        expectedProductVersion: product.version,
        items,
      },
    });
  };

  // Cột phụ thuộc phiên bản sản phẩm và các mutation của khối này nên dựng lại mỗi render, không memo.
  const mediaColumns: ColumnsType<ProductMediaDto> = [
    { title: 'Ảnh', width: 74, render: (_, row) => <Image width={52} height={52} className="object-cover" src={row.thumbnailUrl ?? row.secureUrl} /> },
    col.text<ProductMediaDto>('altText', 'Alt text', { width: undefined }),
    {
      title: 'Phạm vi',
      dataIndex: 'variantId',
      render: (variantId) => variantId
        ? product.variants.find(({ id }) => id === variantId)?.sku ?? 'SKU không tồn tại'
        : 'Toàn sản phẩm',
    },
    { title: 'Ảnh chính', dataIndex: 'isPrimary', align: 'center', render: (value) => value ? <Tag color="gold">Chính</Tag> : '—' },
    {
      title: 'Thứ tự',
      width: 110,
      render: (_, row, index) => (
        <Space size={0}>
          <Button type="text" icon={<UpOutlined />} disabled={pending || index === 0} onClick={() => move(index, -1)} />
          <Button type="text" icon={<DownOutlined />} disabled={pending || index === product.media.length - 1} onClick={() => move(index, 1)} />
        </Space>
      ),
    },
    col.actions<ProductMediaDto>(
      (row) => (
        <>
          <TableActionButton label="Sửa thông tin ảnh" icon={<EditOutlined />} disabled={pending} onClick={() => setEditing(row)} />
          {!row.isPrimary && (
            <TableActionButton
              label="Đặt làm ảnh chính"
              icon={<StarOutlined />}
              disabled={pending}
              onClick={() => update.mutate({
                id: product.id,
                mediaId: row.id,
                data: { isPrimary: true, expectedProductVersion: product.version },
              })}
            />
          )}
          <TableActionButton
            label="Xóa ảnh"
            danger
            icon={<DeleteOutlined />}
            disabled={pending}
            onClick={() => modal.confirm({
              title: 'Xóa vĩnh viễn ảnh?',
              content: 'Ảnh sẽ bị xóa khỏi sản phẩm và Cloudinary. Hệ thống sẽ chặn nếu ảnh còn được nghiệp vụ khác sử dụng.',
              okText: 'Xóa ảnh',
              okButtonProps: { danger: true },
              cancelText: 'Hủy',
              onOk: () => remove.mutateAsync({
                id: product.id,
                mediaId: row.id,
                data: { expectedProductVersion: product.version },
              }),
            })}
          />
        </>
      ),
      { title: '', width: 130 },
    ),
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Form.Item label="Gắn cho" style={{ marginBottom: 0, minWidth: 260 }}>
          <Select
            allowClear
            value={targetVariantId}
            onChange={setTargetVariantId}
            placeholder="Toàn sản phẩm"
            options={product.variants.map((variant) => ({ value: variant.id, label: `${variant.sku} — ${variant.name}` }))}
          />
        </Form.Item>
        <Upload
          accept="image/jpeg,image/png,image/webp,image/avif"
          showUploadList={false}
          disabled={pending || uploading || !canUpload || product.status === 'ARCHIVED'}
          customRequest={customRequest}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading || attach.isPending}>
            Upload và gắn ảnh
          </Button>
        </Upload>
      </div>

      <AdminTable<ProductMediaDto>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={product.media}
        locale={{ emptyText: 'Chưa có ảnh sản phẩm' }}
        columns={mediaColumns}
      />

      <Modal
        open={Boolean(editing)}
        title="Sửa alt text ảnh"
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={update.isPending}
        onCancel={() => setEditing(undefined)}
        onOk={() => editing && update.mutate({
          id: product.id,
          mediaId: editing.id,
          data: { altText: altText.trim() || null, expectedProductVersion: product.version },
        })}
      >
        <Input value={altText} maxLength={500} onChange={(event) => setAltText(event.target.value)} placeholder="Mô tả nội dung ảnh cho SEO và accessibility" />
      </Modal>
    </div>
  );
}
