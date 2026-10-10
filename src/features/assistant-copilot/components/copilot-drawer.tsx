import { useEffect, useRef, useState } from 'react';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Empty, Input, Tag, Tooltip, Typography } from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { COPILOT_LIMITS } from '../constants/copilot.constants';
import { useCopilotPageContext } from '../hooks/copilot-page-context';
import { useCopilotChat } from '../hooks/use-copilot-chat';
import { copilotErrorKind, copilotErrorMessage } from '../model/copilot-error';
import type { CopilotPageHints } from '../model/copilot.types';
import { CopilotMessageList } from './copilot-message-list';
import { DRAWER_WIDTH } from '@/foundation/overlay';

function hintTags(hints: CopilotPageHints | undefined): string[] {
  if (!hints) return [];
  return [
    hints.orderId ? `Đơn #${hints.orderId}` : undefined,
    hints.sku ? `SKU ${hints.sku}` : undefined,
    hints.warehouseCode ? `Kho ${hints.warehouseCode}` : undefined,
  ].filter((value): value is string => Boolean(value));
}

/**
 * Drawer "Trợ lý Copilot": hỏi đáp chỉ đọc về đơn/tồn kho và xác nhận bản nháp điều chỉnh tồn.
 */
export function CopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conversationId, messages, send, reset } = useCopilotChat();
  const pageHints = useCopilotPageContext();
  const [includeHints, setIncludeHints] = useState(true);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
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

  const submit = (content: string) => {
    const text = content.trim();
    if (!text || send.isPending) return;
    send.mutate(
      { content: text, hints: includeHints ? pageHints : undefined },
      { onSuccess: () => setDraft((current) => (current.trim() === text ? '' : current)) },
    );
  };

  const errorKind = send.error ? copilotErrorKind(send.error) : undefined;

  return (
    <Drawer
      title="Trợ lý Copilot"
      width={DRAWER_WIDTH.sm}
      open={open}
      onClose={onClose}
      extra={(
        <Tooltip title="Bắt đầu hội thoại mới">
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={send.isPending || !conversationId}
            onClick={() => { reset(); setDraft(''); }}
          >
            Hội thoại mới
          </Button>
        </Tooltip>
      )}
      styles={{ body: { display: 'flex', flexDirection: 'column', padding: 0 } }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.isError && (
          <QueryErrorAlert
            error={messages.error}
            message="Không tải được hội thoại"
            description={copilotErrorMessage(messages.error)}
            retry={() => void messages.refetch()}
          />
        )}
        {items.length === 0 && pendingContent === undefined && !messages.isLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Hỏi về đơn hàng, tồn kho, hàng tồn thấp, sổ kho, chuyển kho hoặc kiểm kê."
          />
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

      <div className="border-t border-slate-200 px-4 py-3">
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
                {tags.map((tag) => <Tag key={tag} color="blue" className="!m-0">{tag}</Tag>)}
                <Button type="link" size="small" className="!px-1" onClick={() => setIncludeHints(false)}>Bỏ</Button>
              </>
            ) : (
              <Button type="link" size="small" className="!px-1" onClick={() => setIncludeHints(true)}>Dùng lại</Button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Input.TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onPressEnter={(event) => {
              if (event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              submit(draft);
            }}
            autoSize={{ minRows: 1, maxRows: 5 }}
            maxLength={COPILOT_LIMITS.MESSAGE_MAX}
            placeholder="Hỏi trợ lý… (Enter để gửi, Shift+Enter xuống dòng)"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            aria-label="Gửi"
            loading={send.isPending}
            disabled={!draft.trim()}
            onClick={() => submit(draft)}
          />
        </div>
      </div>
    </Drawer>
  );
}
