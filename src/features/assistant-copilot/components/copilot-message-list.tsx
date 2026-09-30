import { Spin } from 'antd';
import { formatDateTime } from '@/lib/format/datetime';
import type { CopilotMessage } from '../model/copilot.types';
import { ActionDraftCard } from './action-draft-card';

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
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {messages.map((message) => (
        <li key={message.id} className={message.role === 'USER' ? 'flex justify-end' : 'flex justify-start'}>
          <div className={`max-w-[92%] rounded-2xl px-3 py-2 ${message.role === 'USER' ? 'bg-blue-50' : 'bg-slate-100'}`}>
            <div className="mb-1 text-xs text-slate-500">
              <strong className="text-slate-700">{message.role === 'USER' ? 'Bạn' : 'Trợ lý'}</strong> · {formatDateTime(message.createdAt)}
            </div>
            {message.content && <div className="whitespace-pre-line text-sm text-slate-800">{message.content}</div>}
            {message.actionDraftIds.map((draftId) => (
              <ActionDraftCard key={draftId} draftId={draftId} onAskAgain={onAskAgain} />
            ))}
          </div>
        </li>
      ))}
      {pendingContent !== undefined && (
        <>
          <li className="flex justify-end">
            <div className="max-w-[92%] rounded-2xl bg-blue-50 px-3 py-2 opacity-70">
              <div className="whitespace-pre-line text-sm text-slate-800">{pendingContent}</div>
            </div>
          </li>
          <li className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
              <Spin size="small" /> <span className="ml-2">Trợ lý đang tra cứu…</span>
            </div>
          </li>
        </>
      )}
    </ol>
  );
}
