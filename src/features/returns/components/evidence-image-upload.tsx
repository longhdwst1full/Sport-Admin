import { useRef, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Image, Upload } from 'antd';
import { uploadSignedImage, type UploadedSignedImage } from '@/lib/media/upload-signed-image';

export const MAX_EVIDENCE_IMAGES = 5;

interface EvidenceImageUploadProps {
  value: UploadedSignedImage[];
  onChange: (images: UploadedSignedImage[]) => void;
  /** Xin chữ ký từ đúng endpoint của mục đích (ảnh phiếu trả của đơn, chứng từ hoàn tiền của phiếu). */
  sign: Parameters<typeof uploadSignedImage>[1];
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

/**
 * Chọn tối đa 5 ảnh, tải thẳng lên Cloudinary và giữ `publicId/version/signature` để API xác minh.
 * UX: ảnh chỉ gắn vào phiếu khi lệnh nghiệp vụ thành công; huỷ modal thì ảnh đã tải không được dùng.
 */
export function EvidenceImageUpload({ value, onChange, sign, disabled, onUploadingChange }: EvidenceImageUploadProps) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(0);
  // Nhiều ảnh tải song song cùng hoàn tất trước khi component cha kịp render lại: đọc `value` từ
  // closure sẽ làm ảnh trước bị ghi đè. Ref giữ danh sách mới nhất ngay sau mỗi lần thêm.
  const latest = useRef(value);
  latest.current = value;
  const pending = useRef(0);

  const track = (delta: number) => {
    pending.current += delta;
    setUploading(pending.current);
    onUploadingChange?.(pending.current > 0);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((image) => (
        <div key={image.publicId} className="relative">
          <Image width={88} height={88} src={image.previewUrl} className="rounded-lg object-cover" />
          <Button
            size="small"
            danger
            shape="circle"
            icon={<DeleteOutlined />}
            aria-label="Bỏ ảnh"
            disabled={disabled}
            className="!absolute right-1 top-1"
            onClick={() => onChange(value.filter((item) => item.publicId !== image.publicId))}
          />
        </div>
      ))}
      {value.length + uploading < MAX_EVIDENCE_IMAGES && (
        <Upload
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          showUploadList={false}
          disabled={disabled}
          customRequest={({ file, onError, onSuccess }) => {
            if (!(file instanceof File)) {
              onError?.(new Error('Tệp tải lên không hợp lệ.'));
              return;
            }
            if (latest.current.length + pending.current >= MAX_EVIDENCE_IMAGES) {
              void message.warning(`Tối đa ${MAX_EVIDENCE_IMAGES} ảnh.`);
              return;
            }
            track(1);
            void uploadSignedImage(file, sign)
              .then((uploaded) => {
                const next = [...latest.current, uploaded].slice(0, MAX_EVIDENCE_IMAGES);
                latest.current = next;
                onChange(next);
                onSuccess?.(uploaded);
              })
              .catch((error: unknown) => {
                const uploadError = error instanceof Error ? error : new Error('Tải ảnh thất bại.');
                onError?.(uploadError);
                void message.error(uploadError.message);
              })
              .finally(() => track(-1));
          }}
        >
          <button
            type="button"
            disabled={disabled}
            className="flex size-[88px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-emerald-600"
          >
            <PlusOutlined />
            {uploading > 0 ? 'Đang tải…' : 'Thêm ảnh'}
          </button>
        </Upload>
      )}
    </div>
  );
}
