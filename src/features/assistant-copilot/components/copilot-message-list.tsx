import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  RobotOutlined,
  SwapOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/lib/format/datetime';
import { COPILOT_SUGGESTED_PROMPTS, type CopilotSuggestionKey } from '../constants/copilot.constants';
import type { CopilotMessage } from '../model/copilot.types';
import { ActionDraftCard } from './action-draft-card';

const SUGGESTION_ICONS: Record<CopilotSuggestionKey, ReactNode> = {
  'orders-pending': <ClockCircleOutlined />,
  'low-stock': <WarningOutlined />,
  inventory: <AppstoreOutlined />,
  movements: <HistoryOutlined />,
  transfers: <SwapOutlined />,
  stocktakes: <AuditOutlined />,
};

/** Biểu tượng trợ lý: nền gradient amber/cam theo màu thương hiệu Admin. */
export function CopilotAvatar({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimension = { sm: 'h-7 w-7 text-sm', md: 'h-9 w-9 text-base', lg: 'h-14 w-14 text-2xl' }[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-500/30 ${dimension}`}
    >
      <RobotOutlined />
    </span>
  );
}

/** Màn chào khi chưa có tin: lời chào + gợi ý câu hỏi (bấm để điền vào ô nhập). */
export function CopilotWelcome({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center px-2 pb-4 pt-6 text-center">
      <CopilotAvatar size="lg" />
      <h3 className="mb-1 mt-3 text-base font-semibold text-slate-900">Xin chào, mình có thể giúp gì?</h3>
      <p className="m-0 max-w-sm text-[13px] leading-relaxed text-slate-500">
        Hỏi về đơn hàng, tồn kho, hàng tồn thấp, sổ kho, chuyển kho hoặc kiểm kê. Trợ lý chỉ tra cứu, không tự thay
        đổi dữ liệu.
      </p>
      <p className="mb-2 mt-5 w-full text-left text-xs font-medium uppercase tracking-wide text-slate-400">Gợi ý câu hỏi</p>
      <ul className="m-0 grid w-full list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {COPILOT_SUGGESTED_PROMPTS.map((suggestion) => (
          <li key={suggestion.key}>
            <button
              type="button"
              onClick={() => onPick(suggestion.prompt)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-solid border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] text-slate-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                {SUGGESTION_ICONS[suggestion.key]}
              </span>
              <span>{suggestion.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function UserBubble({ children, time, pending }: { children: ReactNode; time?: string; pending?: boolean }) {
  return (
    <li className="flex flex-col items-end">
      <div
        className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-amber-400 px-3.5 py-2 text-sm text-slate-900 shadow-sm ${pending ? 'opacity-70' : ''}`}
      >
        {children}
      </div>
      {time && <span className="mt-1 px-1 text-[11px] text-slate-400">{time}</span>}
    </li>
  );
}

/**
 * Luồng tin: tin nhân viên bên phải, tin trợ lý bên trái kèm thẻ bản nháp (`actionDraftIds`).
 *
 * SECURITY: nội dung hiển thị dạng văn bản thuần (không render HTML/markdown từ LLM).
 * CONTRACT: `AdminChatMessageDto` chỉ có văn bản + id bản nháp; kết quả tool chỉ đọc (đơn, tồn, sổ kho...)
 * nằm trong câu trả lời, API chưa trả thẻ dữ liệu có cấu trúc.
 */
export function CopilotMessageList({
  messages,
  pendingContent,
  onAskAgain,
}: {
  messages: CopilotMessage[];
  /** Tin đang gửi: hiện ngay bên phải kèm trạng thái chờ trợ lý trả lời. */
  pendingContent?: string;
  onAskAgain: (prompt: string) => void;
}) {
  return (
    <ol aria-label="Hội thoại với trợ lý" aria-live="polite" className="m-0 flex list-none flex-col gap-4 p-0">
      {messages.map((message) =>
        message.role === 'USER' ? (
          <UserBubble key={message.id} time={formatDateTime(message.createdAt)}>
            <span className="sr-only">Bạn: </span>
            {message.content}
          </UserBubble>
        ) : (
          <li key={message.id} className="flex items-start gap-2">
            <CopilotAvatar />
            <div className="min-w-0 max-w-[88%] flex-1">
              <div className="rounded-2xl rounded-tl-md border border-solid border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                <span className="sr-only">Trợ lý: </span>
                {message.content && (
                  <div className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-800">{message.content}</div>
                )}
                {message.actionDraftIds.map((draftId) => (
                  <ActionDraftCard key={draftId} draftId={draftId} onAskAgain={onAskAgain} />
                ))}
              </div>
              <span className="mt-1 block px-1 text-[11px] text-slate-400">Trợ lý · {formatDateTime(message.createdAt)}</span>
            </div>
          </li>
        ),
      )}
      {pendingContent !== undefined && (
        <>
          <UserBubble pending>{pendingContent}</UserBubble>
          <li className="flex items-start gap-2">
            <CopilotAvatar />
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-solid border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-500 shadow-sm">
              <TypingIndicator />
              <span>Trợ lý đang tra cứu…</span>
            </div>
          </li>
        </>
      )}
    </ol>
  );
}
