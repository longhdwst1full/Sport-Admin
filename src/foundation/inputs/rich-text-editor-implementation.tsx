import { CKEditor, type CKEditorEventPayload } from 'ckeditor4-react';
import { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { RichTextEditorProps } from './rich-text-editor';

const DEFAULT_EDITOR_URL = 'https://cdn.ckeditor.com/4.25.1-lts/full-all/ckeditor.js';

/** Caption mạng xã hội là văn bản thuần: bỏ định dạng chữ, dán thành chữ thuần, giữ link/emoji. */
const PLAIN_TEXT_CONFIG = {
  toolbar: [['Undo', 'Redo'], ['Link', 'Unlink'], ['EmojiPanel', 'SpecialChar']],
  extraPlugins: 'emoji',
  forcePasteAsPlainText: true,
  removePlugins: ['ExportPdf', 'elementspath'],
  resize_enabled: false,
};

/**
 * Đoạn văn email giao dịch. CONTRACT: `allowedContent`/`pasteFilter` khớp allowlist `email-template.rich-text`
 * của API (p, br, strong, em, u, ul/ol/li, a[href]) để thứ người soạn thấy là thứ được lưu và gửi.
 */
const EMAIL_ALLOWED_CONTENT = 'p br strong em u ul ol li; a[!href]';
const EMAIL_CONFIG = {
  toolbar: [
    ['Bold', 'Italic', 'Underline', 'RemoveFormat'],
    ['NumberedList', 'BulletedList'],
    ['Link', 'Unlink'],
    ['Undo', 'Redo'],
  ],
  removePlugins: ['ExportPdf', 'elementspath'],
  resize_enabled: false,
  allowedContent: EMAIL_ALLOWED_CONTENT,
  pasteFilter: EMAIL_ALLOWED_CONTENT,
  enterMode: 1,
  shiftEnterMode: 2,
  linkShowAdvancedTab: false,
  linkShowTargetTab: false,
};

interface CKEditorInstanceLike {
  getData: () => string;
  setData: (html: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
}

export function RichTextEditorImplementation({
  value,
  onChange,
  disabled = false,
  placeholder = 'Nhập nội dung...',
  editorUrl = DEFAULT_EDITOR_URL,
  variant = 'full',
  height,
  handleRef,
  onFocus,
}: RichTextEditorProps) {
  const editorRef = useRef<CKEditorInstanceLike | null>(null);
  const lastValueRef = useRef('');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(
    handleRef,
    () => ({
      // `insertText` chèn tại con trỏ (hoặc thay vùng chọn) và tự phát `change` → form nhận giá trị mới.
      insertText: (text: string) => editorRef.current?.insertText(text),
      focus: () => editorRef.current?.focus(),
    }),
    [],
  );

  useEffect(() => {
    const nextValue = value ?? '';
    if (!editorRef.current || nextValue === lastValueRef.current) return;
    try {
      editorRef.current.setData(nextValue);
      lastValueRef.current = nextValue;
    } catch {
      // CKEditor can reject setData briefly while an instance is being replaced.
    }
  }, [value]);

  const config = useMemo(
    () => ({
      skin: 'moono-lisa',
      height: `${height ?? (variant === 'plain' ? 220 : 320)}px`,
      ...(variant === 'plain' ? PLAIN_TEXT_CONFIG : {}),
      versionCheck: false,
      removePlugins: ['ExportPdf'],
      entities: false,
      basicEntities: false,
      allowedContent: true,
      enterMode: 2,
      shiftEnterMode: 1,
      fillEmptyBlocks: false,
      pasteFilter: null,
      editorplaceholder: placeholder,
      ...(variant === 'email' ? EMAIL_CONFIG : {}),
      font_names:
        'Arial/Arial, Helvetica, sans-serif;' +
        'Comic Sans MS/Comic Sans MS, cursive;' +
        'Courier New/Courier New, Courier, monospace;' +
        'Georgia/Georgia, serif;' +
        'Lucida Sans Unicode/Lucida Sans Unicode, Lucida Grande, sans-serif;' +
        'Tahoma/Tahoma, Geneva, sans-serif;' +
        'Times New Roman/Times New Roman, Times, serif;' +
        'Trebuchet MS/Trebuchet MS, Helvetica, sans-serif;' +
        'Verdana/Verdana, Geneva, sans-serif;' +
        'SVN-Poppins/SVN-Poppins, sans-serif;',
    }),
    [placeholder, variant, height],
  );

  return (
    <div
      className="dctd-rich-text-editor"
      data-editor-state={disabled ? 'read-only' : 'editable'}
    >
      <CKEditor
        scriptUrl={editorUrl}
        data={value ?? ''}
        readOnly={disabled}
        config={config}
        onFocus={onFocus}
        onInstanceReady={(event: CKEditorEventPayload<'instanceReady'>) => {
          const editor = event.editor as unknown as CKEditorInstanceLike | null;
          const nextValue = value ?? '';
          editorRef.current = editor;
          try {
            editor?.setData(nextValue);
            // Lưu bản đã chuẩn hoá của CKEditor (vd. thêm/bỏ khoảng trắng) làm mốc so sánh.
            lastValueRef.current = editor?.getData() ?? nextValue;
          } catch {
            // Keep the form usable if CKEditor is still finalizing its editable area.
          }
        }}
        onChange={(event: CKEditorEventPayload<'change'>) => {
          const editor = event.editor as unknown as CKEditorInstanceLike | null;
          const html = editor?.getData() ?? '';
          // CKEditor phát `change` cả khi nạp/chuẩn hoá dữ liệu ban đầu: chỉ báo ra ngoài khi nội dung
          // thật sự khác, để form không bị coi là đã sửa (hỏi "bỏ thay đổi?") khi người dùng chưa gõ gì.
          if (html === lastValueRef.current) return;
          lastValueRef.current = html;
          onChangeRef.current?.(html);
        }}
      />
    </div>
  );
}
