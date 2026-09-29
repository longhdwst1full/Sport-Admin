import { LockOutlined } from '@ant-design/icons';
import { Empty, Tag } from 'antd';
import { formatDateTime } from '@/lib/format/datetime';
import { supportAuthorTypeLabels } from '../constants/support.constants';
import type { SupportTicketMessage } from '../model/support-ticket.types';

/**
 * Luồng trao đổi của ticket: tin khách bên trái, tin nhân viên bên phải, sự kiện hệ thống ở giữa.
 *
 * UX: ghi chú nội bộ dùng nền vàng + khoá + nhãn "Nội bộ" để không ai nhầm là tin đã gửi cho khách.
 */
export function SupportTicketThread({ messages }: { messages: SupportTicketMessage[] }) {
  if (messages.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trao đổi nào" />;
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {messages.map((message) => (
        <li key={message.id} className={rowClass(message)}>
          {message.authorType === 'SYSTEM' ? (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              {message.body} · {formatDateTime(message.createdAt)}
            </div>
          ) : (
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${bubbleClass(message)}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <strong className="text-slate-700">
                  {message.authorName ?? supportAuthorTypeLabels[message.authorType]}
                </strong>
                <span>{formatDateTime(message.createdAt)}</span>
                {message.internal && (
                  <Tag color="gold" icon={<LockOutlined />} className="!m-0">
                    Nội bộ
                  </Tag>
                )}
              </div>
              <div className="whitespace-pre-line text-sm text-slate-800">{message.body}</div>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function rowClass(message: SupportTicketMessage): string {
  if (message.authorType === 'SYSTEM') return 'flex justify-center';
  return message.authorType === 'STAFF' ? 'flex justify-end' : 'flex justify-start';
}

function bubbleClass(message: SupportTicketMessage): string {
  if (message.internal) return 'border border-dashed border-amber-400 bg-amber-50';
  return message.authorType === 'STAFF' ? 'bg-blue-50' : 'bg-slate-100';
}
