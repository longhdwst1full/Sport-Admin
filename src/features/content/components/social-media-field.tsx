import { useState } from 'react';
import { ArrowLeftOutlined, DeleteOutlined, PictureOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Image } from 'antd';
import { MediaLibraryPickerModal, type PickedMediaKind } from '@/features/media';
import { FacebookPublishType } from '@/generated/api/content/content.schemas';
import { maxMediaFor, type SocialMediaValue } from '../model/social-post-form.mapper';

const allowedKindsFor = (publishType: FacebookPublishType): PickedMediaKind[] =>
  publishType === FacebookPublishType.PHOTOS ? ['IMAGE'] : publishType === FacebookPublishType.FEED ? [] : ['VIDEO'];

/**
 * Ô media của bài Facebook (giá trị form): chọn nhiều ảnh hoặc một video từ Thư viện ảnh, bỏ, đưa lên trước.
 * Loại media được chọn theo loại đăng; luật cuối cùng vẫn do API kiểm (400 SOCIAL_MEDIA_INVALID).
 */
export function SocialMediaField({
  value = [],
  onChange,
  publishType,
  disabled,
}: {
  value?: SocialMediaValue[];
  onChange?: (value: SocialMediaValue[]) => void;
  publishType: FacebookPublishType;
  disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const max = maxMediaFor(publishType);
  if (max === 0) {
    return <span className="text-xs text-slate-500">Bài viết dạng chữ không kèm ảnh/video.</span>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {value.map((item, index) => (
          <div key={item.id} className="relative overflow-hidden rounded-xl border border-slate-200">
            <Image width={92} height={92} src={item.url} className="object-cover" />
            {item.kind === 'VIDEO' && (
              <PlayCircleOutlined className="absolute left-1 top-1 rounded-full bg-black/50 p-1 text-white" />
            )}
            <div className="flex justify-between gap-1 bg-slate-50 px-1 py-1">
              {index > 0 ? (
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  disabled={disabled}
                  aria-label={`Đưa media ${index + 1} lên trước`}
                  onClick={() => {
                    const next = [...value];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange?.(next);
                  }}
                />
              ) : (
                <span />
              )}
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={disabled}
                aria-label={`Bỏ media ${index + 1}`}
                onClick={() => onChange?.(value.filter((entry) => entry.id !== item.id))}
              />
            </div>
          </div>
        ))}
      </div>
      <Button icon={<PictureOutlined />} disabled={disabled} onClick={() => setPickerOpen(true)}>
        Chọn từ Thư viện ảnh ({value.length}/{max})
      </Button>
      {pickerOpen && (
        <MediaLibraryPickerModal
          open
          max={max}
          allowedKinds={allowedKindsFor(publishType)}
          initialSelected={value}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(selected) => {
            onChange?.(selected);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
