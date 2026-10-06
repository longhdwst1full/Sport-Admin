import { Checkbox } from 'antd';
import { tiktokConsentDeclaration } from '../model/tiktok-post-settings';

/**
 * Câu đồng ý TikTok yêu cầu hiện trước khi đăng (Content Sharing Guidelines — Required Consent Declarations): nguyên văn
 * tiếng Anh kèm bản dịch tiếng Việt và link tới văn bản pháp lý. Có `onCheckedChange` thì hiện thành ô xác nhận
 * (modal duyệt chặn nút đăng tới khi tích).
 */
export function TikTokConsentDeclaration({
  brandedContent,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  brandedContent: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const declaration = tiktokConsentDeclaration(brandedContent);
  const text = (
    <span className="text-sm text-slate-700">
      <span className="block">{declaration.en}</span>
      <span className="block text-xs text-slate-500">{declaration.vi}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 text-xs">
        {declaration.links.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
      </span>
    </span>
  );
  return (
    <div className={`rounded-md bg-slate-50 p-3 ${className ?? ''}`}>
      {onCheckedChange ? (
        <Checkbox checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)}>
          {text}
        </Checkbox>
      ) : (
        text
      )}
    </div>
  );
}
