import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Input, Tag, Tooltip, Typography, type GetRef } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { COPILOT_LIMITS } from '../constants/copilot.constants';
import { useCopilotPageContext } from '../hooks/copilot-page-context';
import { useCopilotChat } from '../hooks/use-copilot-chat';
import { copilotErrorKind, copilotErrorMessage } from '../model/copilot-error';
import type { CopilotPageHints } from '../model/copilot.types';
import { CopilotAvatar, CopilotMessageList, CopilotWelcome } from './copilot-message-list';
import { DRAWER_WIDTH } from '@/foundation/overlay';

function hintTags(hints: CopilotPageHints | undefined): string[] {
  if (!hints) return [];
  return [
    hints.orderId ? `Đơn #${hints.orderId}` : undefined,
    hints.sku ? `SKU ${hints.sku}` : undefined,
    hints.warehouseCode ? `Kho ${hints.warehouseCode}` : undefined,
  ].filter((value): value is string => Boolean(value));
}

/** Hiện bộ đếm ký tự khi nội dung chạm 80% trần `COPILOT_LIMITS.MESSAGE_MAX`. */
const COUNT_VISIBLE_RATIO = 0.8;
const KBD_CLASS = 'rounded border border-solid border-slate-200 bg-slate-50 px-1 font-sans text-[10px] text-slate-500';

/**
 * Drawer "Trợ lý Copilot": hỏi đáp chỉ đọc về đơn/tồn kho và xác nhận bản nháp điều chỉnh tồn.
 */
export function CopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conversationId, messages, send, reset } = useCopilotChat();
  const pageHints = useCopilotPageContext();
  const [includeHints, setIncludeHints] = useState(true);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<GetRef<typeof Input.TextArea>>(null);
  const tags = hintTags(pageHints);
  const items = messages.data?.items ?? [];
  const pendingContent = send.isPending ? send.variables?.content : undefined;

  // Trang mới công bố gợi ý khác → mặc định dùng lại gợi ý. Đặt lại ngay trong render theo mẫu
  // "adjusting state when a prop changes" thay vì effect (RULE-HOOK-01).
  const [hintsSource, setHintsSource] = useState(pageHints);
  if (hintsSource !== pageHints) {
    setHintsSource(pageHints);
    setIncludeHints(true);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [items.length, pendingContent]);

  const pickSuggestion = (prompt: string) => {
    setDraft(prompt);
    // Chờ ô nhập nhận giá trị mới rồi mới đặt con trỏ cuối dòng.
    requestAnimationFrame(() => inputRef.current?.focus({ cursor: 'end' }));
  };

  const submit = (content: string) => {
    const text = content.trim();
    if (!text || send.isPending) return;
    send.mutate(
      { content: text, hints: includeHints ? pageHints : undefined },
      { onSuccess: () => setDraft((current) => (current.trim() === text ? '' : current)) },
    );
  };

  const errorKind = send.error ? copilotErrorKind(send.error) : undefined;
  const showCount = draft.length >= COPILOT_LIMITS.MESSAGE_MAX * COUNT_VISIBLE_RATIO;

  return (
    <Drawer
      width={DRAWER_WIDTH.sm}
      open={open}
      onClose={onClose}
      closable={false}
      title={(
        <div className="flex items-center gap-3">
          <CopilotAvatar size="md" />
          <div className="min-w-0 leading-tight">
            <div className="text-[15px] font-semibold text-slate-900">Trợ lý Copilot</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-slate-500" role="status">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${send.isPending ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`}
              />
              {send.isPending ? 'Đang trả lời…' : 'Sẵn sàng'}
            </div>
          </div>
        </div>
      )}
      extra={(
        <div className="flex items-center gap-1">
          <Tooltip title="Bắt đầu hội thoại mới">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              disabled={send.isPending || !conversationId}
              onClick={() => { reset(); setDraft(''); }}
            >
              Hội thoại mới
            </Button>
          </Tooltip>
          <Tooltip title="Đóng">
            <Button type="text" size="small" aria-label="Đóng trợ lý" icon={<CloseOutlined />} onClick={onClose} />
          </Tooltip>
        </div>
      )}
      styles={{
        header: { padding: '12px 16px', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 70%)' },
        body: { display: 'flex', flexDirection: 'column', padding: 0, background: '#f8fafc' },
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.isError && (
          <QueryErrorAlert
            error={messages.error}
            message="Không tải được hội thoại"
            description={copilotErrorMessage(messages.error)}
            retry={() => void messages.refetch()}
          />
        )}
        {items.length === 0 && pendingContent === undefined && !messages.isLoading ? (
          <CopilotWelcome onPick={pickSuggestion} />
        ) : (
          <CopilotMessageList messages={items} pendingContent={pendingContent} onAskAgain={submit} />
        )}
        {messages.data?.hasMore && (
          <Typography.Text type="secondary" className="mt-2 block text-center text-xs">
            Chỉ hiển thị {COPILOT_LIMITS.MESSAGE_PAGE_SIZE} tin gần nhất.
          </Typography.Text>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-0 border-t border-solid border-slate-200 bg-white px-4 pb-3 pt-3">
        {send.error !== null && send.error !== undefined && (
          <Alert
            type={errorKind === 'unavailable' || errorKind === 'quota' ? 'warning' : 'error'}
            showIcon
            closable
            className="!mb-2"
            message={copilotErrorMessage(send.error)}
            onClose={() => send.reset()}
          />
        )}
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <span>Ngữ cảnh trang:</span>
            {includeHints ? (
              <>
                {tags.map((tag) => <Tag key={tag} color="gold" bordered={false} className="!m-0">{tag}</Tag>)}
                <Button type="link" size="small" className="!px-1" onClick={() => setIncludeHints(false)}>Bỏ</Button>
              </>
            ) : (
              <Button type="link" size="small" className="!px-1" onClick={() => setIncludeHints(true)}>Dùng lại</Button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-solid border-slate-300 bg-white py-1.5 pl-1.5 pr-1.5 transition-shadow focus-within:border-amber-400 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.15)]">
          <Input.TextArea
            ref={inputRef}
            variant="borderless"
            aria-label="Nội dung câu hỏi cho trợ lý"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPressEnter={(event) => {
              if (event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              submit(draft);
            }}
            autoSize={{ minRows: 1, maxRows: 5 }}
            maxLength={COPILOT_LIMITS.MESSAGE_MAX}
            placeholder="Hỏi trợ lý về đơn hàng, tồn kho…"
            className="!text-sm"
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            aria-label="Gửi"
            loading={send.isPending}
            disabled={!draft.trim()}
            onClick={() => submit(draft)}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>
            <kbd className={KBD_CLASS}>Enter</kbd> để gửi · <kbd className={KBD_CLASS}>Shift</kbd> + <kbd className={KBD_CLASS}>Enter</kbd> xuống dòng
          </span>
          {showCount && (
            <span aria-live="polite">{draft.length.toLocaleString('vi-VN')}/{COPILOT_LIMITS.MESSAGE_MAX.toLocaleString('vi-VN')}</span>
          )}
        </div>
      </div>
    </Drawer>
  );
}
