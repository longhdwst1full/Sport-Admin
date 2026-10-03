import { UploadOutlined } from '@ant-design/icons';
import { App, Button, Image, Input, Space, Upload } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { uploadImage } from '@/lib/media/upload-image';
import { useImageUpload } from '@/shared/hooks/use-image-upload';
import { IMAGE_FALLBACK_SRC } from '../constants/media-library.constants';

interface ImageUploadFieldProps {
  value: string;
  /** `assetId` chỉ có khi ảnh vừa được tải lên; dán URL tay thì không có. */
  onChange: (url: string, assetId?: string) => void;
  disabled?: boolean;
}

export function ImageUploadField({ value, onChange, disabled }: ImageUploadFieldProps) {
  const { message } = App.useApp();
  const { uploading, customRequest } = useImageUpload(uploadImage);
  // SECURITY: upload đi qua endpoint media yêu cầu media.asset.upload; nhập URL thủ công thì không.
  const canUpload = useCan('media.asset.upload');

  return (
    <Space.Compact block>
      {value ? <Image fallback={IMAGE_FALLBACK_SRC} width={40} height={32} src={value} className="object-cover" /> : null}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="URL ảnh sau khi upload"
        disabled={disabled || uploading}
      />
      <Upload
        accept="image/jpeg,image/png,image/webp,image/avif"
        showUploadList={false}
        disabled={disabled || uploading || !canUpload}
        customRequest={(options) =>
          customRequest(options, {
            onSuccess: (asset) => {
              onChange(asset.secureUrl, asset.id);
              void message.success('Đã tải ảnh lên Cloudinary');
            },
            onError: (error) => void message.error(error.message),
          })
        }
      >
        <Button icon={<UploadOutlined />} loading={uploading} disabled={disabled || !canUpload}>
          Upload
        </Button>
      </Upload>
    </Space.Compact>
  );
}
