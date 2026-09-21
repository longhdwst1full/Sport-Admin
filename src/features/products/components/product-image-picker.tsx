import { DeleteOutlined, StarFilled, UploadOutlined } from '@ant-design/icons';
import { App, Button, Image, Upload } from 'antd';
import { useState } from 'react';
import { useCan } from '@/core/auth/permissions';
import { uploadImage } from '@/lib/media/upload-image';

export interface PendingProductImage {
  assetId: string;
  url: string;
}

/**
 * Chọn nhiều ảnh ngay ở màn tạo sản phẩm.
 *
 * Ảnh được tải lên kho media trước, nhưng chỉ **gắn** vào sản phẩm sau khi sản phẩm tồn tại — API
 * gắn ảnh cần `productId`. Vì vậy ở đây chỉ giữ danh sách asset đã tải; ảnh đầu tiên là ảnh chính.
 *
 * Ảnh đã tải nhưng người dùng bỏ form giữa chừng sẽ nằm lại trong thư viện media, không mồ côi ở
 * Cloudinary: `media.asset.*` vẫn quản lý chúng và có thể dọn ở màn Thư viện ảnh.
 */
export function ProductImagePicker({
  value,
  disabled,
  onChange,
}: {
  value: PendingProductImage[];
  disabled?: boolean;
  onChange: (next: PendingProductImage[]) => void;
}) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  // SECURITY: upload đi qua endpoint media yêu cầu media.asset.upload.
  const canUpload = useCan('media.asset.upload');

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {value.map((image, index) => (
          <div
            key={image.assetId}
            className="relative overflow-hidden rounded-xl border border-slate-200"
          >
            <Image width={92} height={92} src={image.url} className="object-cover" />
            {index === 0 && (
              <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                <StarFilled /> Ảnh chính
              </span>
            )}
            <div className="flex justify-between gap-1 bg-slate-50 px-1 py-1">
              {index > 0 && (
                <Button
                  size="small"
                  type="link"
                  disabled={disabled}
                  onClick={() =>
                    // Ảnh chính là ảnh đầu danh sách, nên "đặt làm ảnh chính" là đưa nó lên đầu.
                    onChange([image, ...value.filter((item) => item.assetId !== image.assetId)])
                  }
                >
                  Đặt chính
                </Button>
              )}
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={disabled}
                aria-label={`Bỏ ảnh ${index + 1}`}
                onClick={() => onChange(value.filter((item) => item.assetId !== image.assetId))}
              />
            </div>
          </div>
        ))}
      </div>

      <Upload
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        showUploadList={false}
        disabled={disabled || uploading || !canUpload}
        customRequest={({ file, onError, onSuccess }) => {
          if (!(file instanceof File)) {
            onError?.(new Error('Tệp tải lên không hợp lệ.'));
            return;
          }
          setUploading(true);
          void uploadImage(file)
            .then((asset) => {
              onChange([...value, { assetId: asset.id, url: asset.secureUrl }]);
              onSuccess?.(asset);
            })
            .catch((error: unknown) => {
              const uploadError = error instanceof Error ? error : new Error('Upload ảnh thất bại.');
              onError?.(uploadError);
              void message.error(uploadError.message);
            })
            .finally(() => setUploading(false));
        }}
      >
        <Button icon={<UploadOutlined />} loading={uploading} disabled={disabled || !canUpload}>
          Tải ảnh lên
        </Button>
      </Upload>
    </div>
  );
}
