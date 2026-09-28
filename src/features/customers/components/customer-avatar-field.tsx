import { DeleteOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import { App, Avatar, Button, Upload } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { uploadImage } from '@/lib/media/upload-image';
import { useImageUpload } from '@/shared/hooks/use-image-upload';

/**
 * Ảnh đại diện khách hàng.
 *
 * Ô URL + nút Upload dùng chung của thư viện media phù hợp cho ảnh sản phẩm — nơi người nhập hay dán
 * lại đường dẫn có sẵn. Ở hồ sơ khách thì chỉ có một ảnh và người nhập luôn tải lên, nên ô này chỉ
 * hiện đúng ảnh tròn kèm hai nút; đường dẫn không phải thứ ai cần đọc.
 */
export function CustomerAvatarField({
  url,
  disabled,
  onChange,
}: {
  url?: string;
  disabled?: boolean;
  onChange: (next: { url: string; assetId?: string }) => void;
}) {
  const { message } = App.useApp();
  const { uploading, customRequest } = useImageUpload(uploadImage);
  // SECURITY: upload đi qua endpoint media yêu cầu media.asset.upload.
  const canUpload = useCan('media.asset.upload');

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar
        size={88}
        src={url || undefined}
        icon={<UserOutlined />}
        className="!bg-slate-100 !text-slate-400 ring-4 ring-white shadow-sm"
      />
      <Upload
        accept="image/jpeg,image/png,image/webp,image/avif"
        showUploadList={false}
        disabled={disabled || uploading || !canUpload}
        customRequest={(options) =>
          customRequest(options, {
            onSuccess: (asset) => onChange({ url: asset.secureUrl, assetId: asset.id }),
            onError: (error) => void message.error(error.message),
          })
        }
      >
        <Button size="small" icon={<UploadOutlined />} loading={uploading} disabled={disabled || !canUpload}>
          {url ? 'Đổi ảnh' : 'Tải ảnh'}
        </Button>
      </Upload>
      {url ? (
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={disabled}
          onClick={() => onChange({ url: '', assetId: undefined })}
        >
          Gỡ ảnh
        </Button>
      ) : null}
    </div>
  );
}
