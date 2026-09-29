import { useState } from 'react';
import { App, Button, Card, Descriptions, Drawer, Space, Typography } from 'antd';
import { usePermissions } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { StatusTag } from '@/foundation/management';
import { formatDateTime } from '@/lib/format/datetime';
import {
  supportTicketPriorityPresentation,
  supportTicketStatusPresentation,
} from '../constants/support.constants';
import { useBranchLabels } from '../hooks/use-branch-labels';
import { useSupportTicket } from '../hooks/use-support-tickets';
import { useSupportTicketCommand, type SupportTicketCommand } from '../hooks/use-support-ticket-command';
import {
  availableSupportTicketActions,
  canReplySupportTicket,
  type SupportTicketAction,
} from '../model/support-ticket-actions.policy';
import type { SupportTicketDetail } from '../model/support-ticket.types';
import { SupportReplyBox } from './support-reply-box';
import { SupportTicketActionModal } from './support-ticket-action-modal';
import { SupportTicketThread } from './support-ticket-thread';

const actionButtons: Record<SupportTicketAction, { label: string; type?: 'primary' }> = {
  assign: { label: 'Giao việc' },
  resolve: { label: 'Đã giải quyết', type: 'primary' },
  close: { label: 'Đóng ticket' },
};

/** Chi tiết ticket: thông tin, luồng trao đổi, ô trả lời và các lệnh chuyển trạng thái. */
export function SupportTicketDetailDrawer({ ticketId, onClose }: { ticketId?: string; onClose: () => void }) {
  const { message } = App.useApp();
  const permissions = usePermissions();
  const [action, setAction] = useState<SupportTicketAction>();
  const query = useSupportTicket(ticketId);
  const ticket = query.data;
  const command = useSupportTicketCommand(ticket);
  // Lỗi của ô trả lời và của modal hiển thị riêng chỗ, dù dùng chung một mutation.
  const replyError = command.variables?.action === 'reply' ? command.error : undefined;

  const closeAction = () => {
    if (command.isPending) return;
    command.reset();
    setAction(undefined);
  };
  const closeDrawer = () => {
    if (command.isPending) return;
    closeAction();
    onClose();
  };
  const submitAction = (next: SupportTicketCommand) => {
    command.mutate(next, {
      onSuccess: () => {
        void message.success('Đã cập nhật ticket');
        command.reset();
        setAction(undefined);
      },
    });
  };
  const submitReply = async (reply: { body: string; isInternal: boolean }) => {
    try {
      await command.mutateAsync({ action: 'reply', body: reply });
      void message.success(reply.isInternal ? 'Đã lưu ghi chú nội bộ' : 'Đã gửi trả lời');
      command.reset();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Drawer
      open={Boolean(ticketId)}
      onClose={closeDrawer}
      width={880}
      title={ticket ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>{ticket.ticketNo}</span>
          <StatusTag status={ticket.status} presentations={supportTicketStatusPresentation} />
          <StatusTag status={ticket.priority} presentations={supportTicketPriorityPresentation} />
        </div>
      ) : 'Ticket hỗ trợ'}
      extra={ticket && <ActionBar ticket={ticket} permissions={permissions} onAction={setAction} />}
      destroyOnHidden
    >
      {query.isLoading && <Card loading className="rounded-2xl" />}
      {query.isError && (
        <QueryErrorAlert error={query.error} message="Không tải được ticket" retry={() => void query.refetch()} />
      )}
      {ticket && (
        <div className="space-y-5">
          <TicketSummary ticket={ticket} />
          <Card size="small" title="Trao đổi" className="rounded-2xl">
            <SupportTicketThread messages={ticket.messages} />
          </Card>
          <SupportReplyBox
            disabled={!canReplySupportTicket(ticket, permissions)}
            disabledReason={replyDisabledReason(ticket, permissions)}
            submitting={command.isPending && command.variables?.action === 'reply'}
            error={replyError}
            onSubmit={submitReply}
          />
          <SupportTicketActionModal
            ticket={ticket}
            action={action}
            submitting={command.isPending}
            error={command.variables?.action === 'reply' ? undefined : command.error}
            onSubmit={submitAction}
            onClose={closeAction}
          />
        </div>
      )}
    </Drawer>
  );
}

function replyDisabledReason(ticket: SupportTicketDetail, permissions: ReadonlySet<string>): string | undefined {
  if (ticket.status === 'CLOSED') return 'Ticket đã đóng, không trả lời thêm được.';
  if (!canReplySupportTicket(ticket, permissions)) return 'Bạn không có quyền trả lời ticket (support.ticket.manage).';
  return undefined;
}

function ActionBar({
  ticket,
  permissions,
  onAction,
}: {
  ticket: SupportTicketDetail;
  permissions: ReadonlySet<string>;
  onAction: (action: SupportTicketAction) => void;
}) {
  const actions = availableSupportTicketActions(ticket, permissions);
  if (actions.length === 0) return null;
  return (
    <Space wrap>
      {actions.map((action) => (
        <Button key={action} type={actionButtons[action].type} onClick={() => onAction(action)}>
          {action === 'assign' && ticket.status === 'ASSIGNED' ? 'Giao lại' : actionButtons[action].label}
        </Button>
      ))}
    </Space>
  );
}

function TicketSummary({ ticket }: { ticket: SupportTicketDetail }) {
  const branchLabel = useBranchLabels();
  return (
    <Card size="small" className="rounded-2xl">
      <Typography.Title level={5} className="!mt-0">{ticket.subject}</Typography.Title>
      <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Khách hàng">{ticket.customerName} · {ticket.customerNo}</Descriptions.Item>
        <Descriptions.Item label="Điện thoại">{ticket.customerPhone ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Email">{ticket.customerEmail ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Chi nhánh">{branchLabel(ticket.branchId) ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Người xử lý">{ticket.assigneeName ?? 'Chưa giao'}</Descriptions.Item>
        <Descriptions.Item label="Tạo lúc">{formatDateTime(ticket.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Cập nhật">{formatDateTime(ticket.updatedAt)}</Descriptions.Item>
        {ticket.assignedAt && <Descriptions.Item label="Giao lúc">{formatDateTime(ticket.assignedAt)}</Descriptions.Item>}
        {ticket.resolvedAt && <Descriptions.Item label="Giải quyết lúc">{formatDateTime(ticket.resolvedAt)}</Descriptions.Item>}
        {ticket.closedAt && <Descriptions.Item label="Đóng lúc">{formatDateTime(ticket.closedAt)}</Descriptions.Item>}
      </Descriptions>
      {ticket.resolutionNote && (
        <Typography.Paragraph type="secondary" className="!mb-0 mt-2 whitespace-pre-line">
          Ghi chú giải quyết: {ticket.resolutionNote}
        </Typography.Paragraph>
      )}
    </Card>
  );
}
