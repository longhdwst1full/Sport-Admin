import { Skeleton } from 'antd';
import { lazy, Suspense, type Ref } from 'react';

/** Điều khiển editor từ ngoài (vd. chèn biến `{{orderNo}}` tại con trỏ). */
export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

export interface RichTextEditorProps {
  value?: string | null;
  onChange?: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  editorUrl?: string;
  /**
   * `plain`: soạn văn bản thuần (caption mạng xã hội) — toolbar tối giản (hoàn tác, link, emoji, ký tự
   * đặc biệt), dán luôn thành chữ thuần, không định dạng chữ. Chỗ gọi tự chuyển HTML ⇄ text bằng
   * `htmlToPlainText` / `plainTextToHtml` (`@/shared/utils`).
   *
   * `email`: đoạn văn trong email giao dịch — toolbar gọn (đậm/nghiêng/gạch chân, danh sách, link) và
   * bộ lọc nội dung khớp allowlist email của API, nên thứ dán vào không lọt định dạng sẽ bị server bỏ.
   */
  variant?: 'full' | 'plain' | 'email';
  height?: number;
  /** Nhận handle khi editor sẵn sàng; `null` khi editor bị huỷ. */
  handleRef?: Ref<RichTextEditorHandle>;
  onFocus?: () => void;
}

const RichTextEditorImplementation = lazy(() =>
  import('./rich-text-editor-implementation').then((module) => ({
    default: module.RichTextEditorImplementation,
  })),
);

export function RichTextEditor(props: RichTextEditorProps) {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 6 }} />}>
      <RichTextEditorImplementation {...props} />
    </Suspense>
  );
}
