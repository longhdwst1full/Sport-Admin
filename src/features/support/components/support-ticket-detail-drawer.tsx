import { useState } from 'react';
import { App, Button, Card, Descriptions, Space, Typography } from 'antd';
import { usePermissions } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { formatDateTime } from '@/lib/format/datetime';
import {
  supportTicketPriorityPresentation,
  supportTicketStatusPresentation,
} from '../constants/support.constants';
import { useBranchLabels } from '@/features/organization';
import { useSupportTicket } from '../hooks/use-support-tickets';
import { useSupportTicketCommand, type SupportTicketCommand } from '../hooks/use-support-ticket-command';
import {
  availableSupportTicketActions,
  canReplySupportTicket,
  type SupportTicketAction,
} from '../model/support-ticket-actions.policy';
import { supportCommandErrorMessage } from '../model/support-command-error';
import type { SupportTicketDetail } from '../model/support-ticket.types';
import { SupportReplyBox } from './support-reply-box';
import { SupportTicketActionModal } from './support-ticket-action-modal';
import { SupportTicketThread } from './support-ticket-thread';
import { DetailDrawer } from '@/foundation/overlay';

const actionButtons: Record<SupportTicketAction, { label: string; type?: 'primary' }> = {
  assign: { label: 'Giao việc' },
  resolve: { label: 'Đã giải quyết', type: 'primary' },
  close: { label: 'Đóng phiếu' },
};

/** Chi tiết ticket: thông tin, luồng trao đổi, ô trả lời và các lệnh chuyển trạng thái. */
export function SupportTicketDetailDrawer({ ticketId, onClose }: { ticketId?: string; onClose: () => void }) {
  const { message } = App.useApp();
  const permissions = usePermissions();
  const [action, setAction] = useState<SupportTicketAction>();
  const query = useSupportTicket(ticketId);
  const ticket = query.data;
  const command = useSupportTicketCommand(ticket);

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
        void message.success('Đã cập nhật phiếu hỗ trợ');
        command.reset();
        setAction(undefined);
      },
      onError: (error) => {
        void message.error(supportCommandErrorMessage(error));
      },
    });
  };
  const submitReply = async (reply: { body: string; isInternal: boolean }) => {
    try {
      await command.mutateAsync({ action: 'reply', body: reply });
      void message.success(reply.isInternal ? 'Đã lưu ghi chú nội bộ' : 'Đã gửi trả lời');
      command.reset();
      return true;
    } catch (error) {
      void message.error(supportCommandErrorMessage(error));
      return false;
    }
  };

  return (
    <DetailDrawer
      open={Boolean(ticketId)}
      onClose={closeDrawer}
      title={ticket?.ticketNo ?? 'Phiếu hỗ trợ'}
      status={ticket && (
        <>
          <StatusTag status={ticket.status} presentations={supportTicketStatusPresentation} />
          <StatusTag status={ticket.priority} presentations={supportTicketPriorityPresentation} />
        </>
      )}
      actions={ticket && <ActionBar ticket={ticket} permissions={permissions} onAction={setAction} />}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
    >
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
            onSubmit={submitReply}
          />
          <SupportTicketActionModal
            ticket={ticket}
            action={action}
            submitting={command.isPending}
            onSubmit={submitAction}
            onClose={closeAction}
          />
        </div>
      )}
    </DetailDrawer>
  );
}

function replyDisabledReason(ticket: SupportTicketDetail, permissions: ReadonlySet<string>): string | undefined {
  if (ticket.status === 'CLOSED') return 'Phiếu hỗ trợ đã đóng, không trả lời thêm được.';
  if (!canReplySupportTicket(ticket, permissions)) return 'Bạn không có quyền trả lời phiếu hỗ trợ (support.ticket.manage).';
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
        <Descriptions.Item label="Khách hàng">
          {ticket.customerName} · {ticket.isGuest ? 'Khách vãng lai' : ticket.customerNo}
        </Descriptions.Item>
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
