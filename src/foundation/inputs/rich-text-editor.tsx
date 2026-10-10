import { Skeleton } from 'antd';
import { lazy, Suspense } from 'react';

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
   */
  variant?: 'full' | 'plain';
  height?: number;
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
