import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { captionLength } from '../model/social-post-form.mapper';

/**
 * Ô caption mạng xã hội dùng CKEditor bản `plain` (dán thành chữ thuần, không định dạng). Giá trị là HTML của
 * editor; mapper đổi sang văn bản thuần khi gửi. Bộ đếm và giới hạn tính trên văn bản thuần — Facebook/TikTok
 * đếm ký tự hiển thị chứ không đếm thẻ HTML. Dùng làm control của `Form.Item` (nhận `value`/`onChange`).
 */
export function SocialCaptionInput({
  value,
  onChange,
  max,
  disabled,
  placeholder,
}: {
  value?: string;
  onChange?: (html: string) => void;
  max: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const length = captionLength(value);
  return (
    <div>
      <RichTextEditor variant="plain" value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} />
      <div
        className={`mt-1 text-right text-xs ${length > max ? 'text-rose-600' : 'text-slate-500'}`}
        aria-live="polite"
      >
        {length.toLocaleString('vi-VN')}/{max.toLocaleString('vi-VN')}
      </div>
    </div>
  );
}
