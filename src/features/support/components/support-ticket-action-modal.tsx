import { Descriptions, Form, Input, Select, Typography } from 'antd';
import { FormModal } from '@/foundation/overlay';
import { StatusTag } from '@/foundation/management';
import { SUPPORT_LIMITS, supportTicketStatusPresentation } from '../constants/support.constants';
import type { SupportTicketCommand } from '../hooks/use-support-ticket-command';
import { useSupportAssigneeOptions } from '../hooks/use-support-assignee-options';
import type { SupportTicketAction } from '../model/support-ticket-actions.policy';
import type { SupportTicketDetail } from '../model/support-ticket.types';

const titles: Record<SupportTicketAction, { title: string; okText: string; consequence: string }> = {
  assign: {
    title: 'Giao phiếu hỗ trợ',
    okText: 'Giao việc',
    consequence: 'Người được giao chịu trách nhiệm trả lời khách; phiếu chuyển sang "Đang xử lý".',
  },
  resolve: {
    title: 'Đánh dấu đã giải quyết',
    okText: 'Đã giải quyết',
    consequence: 'Phiếu chuyển sang "Đã giải quyết"; ghi chú giải quyết được lưu vào hồ sơ phiếu.',
  },
  close: {
    title: 'Đóng phiếu hỗ trợ',
    okText: 'Đóng phiếu',
    consequence: 'Phiếu đã đóng chỉ còn đọc: không trả lời, ghi chú hay giao lại được nữa.',
  },
};

interface FormValues {
  assigneeUserId?: string;
  resolutionNote?: string;
}

interface SupportTicketActionModalProps {
  ticket: SupportTicketDetail;
  action?: SupportTicketAction;
  submitting: boolean;
  onSubmit: (command: SupportTicketCommand) => void;
  onClose: () => void;
}

/**
 * Một modal cho giao việc / giải quyết / đóng. Hiện trạng thái hiện tại, hành động và hệ quả trước khi
 * xác nhận (`04-permissions-transitions.md`). Modal chỉ đóng khi lệnh thành công; lỗi giữ nguyên dữ liệu.
 *
 * `key` theo lệnh + người đang được giao: mở lệnh khác hoặc người xử lý vừa đổi (tải lại sau xung đột) thì
 * form dựng mới với giá trị mặc định, không cần effect reset (RULE-HOOK-01).
 */
export function SupportTicketActionModal(props: SupportTicketActionModalProps) {
  if (!props.action) return null;
  return (
    <SupportTicketActionForm
      key={`${props.action}:${props.ticket.assigneeUserId ?? ''}`}
      {...props}
      action={props.action}
    />
  );
}

function SupportTicketActionForm({
  ticket,
  action,
  submitting,
  onSubmit,
  onClose,
}: SupportTicketActionModalProps & { action: SupportTicketAction }) {
  const [form] = Form.useForm<FormValues>();
  const assignees = useSupportAssigneeOptions(action === 'assign', ticket.branchId);
  const meta = titles[action];

  const submit = (values: FormValues) => {
    if (action === 'assign' && values.assigneeUserId) {
      onSubmit({ action, body: { assigneeUserId: values.assigneeUserId } });
    } else if (action === 'resolve' && values.resolutionNote) {
      onSubmit({ action, body: { resolutionNote: values.resolutionNote.trim() } });
    } else if (action === 'close') {
      onSubmit({ action, body: {} });
    }
  };

  return (
    <FormModal
      open
      title={meta.title}
      okText={meta.okText}
      submitting={submitting}
      isDirty={() => form.isFieldsTouched()}
      onSubmit={() => form.submit()}
      onClose={onClose}
    >
      <Descriptions size="small" column={1} className="mb-3">
        <Descriptions.Item label="Phiếu hỗ trợ">{ticket.ticketNo}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái hiện tại">
          <StatusTag status={ticket.status} presentations={supportTicketStatusPresentation} />
        </Descriptions.Item>
        {action === 'assign' && (
          <Descriptions.Item label="Đang giao cho">{ticket.assigneeName ?? 'Chưa giao'}</Descriptions.Item>
        )}
      </Descriptions>
      <Typography.Paragraph type="secondary">{meta.consequence}</Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ assigneeUserId: action === 'assign' ? ticket.assigneeUserId : undefined }}
        onFinish={submit}
        disabled={submitting}
      >
        {action === 'assign' && (
          <Form.Item
            name="assigneeUserId"
            label="Người nhận"
            rules={[{ required: true, message: 'Chọn người nhận' }]}
            extra={assignees.limitedToSelf ? 'Bạn chỉ có thể tự nhận phiếu vì không có quyền giao việc.' : undefined}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={assignees.loading}
              options={assignees.options}
              placeholder="Chọn nhân viên"
            />
          </Form.Item>
        )}
        {action === 'resolve' && (
          <Form.Item
            name="resolutionNote"
            label="Ghi chú giải quyết"
            rules={[{ required: true, whitespace: true, message: 'Nhập cách đã giải quyết cho khách' }]}
          >
            <Input.TextArea rows={4} maxLength={SUPPORT_LIMITS.RESOLUTION_NOTE_MAX} showCount placeholder="Đã xử lý thế nào, kết quả cho khách" />
          </Form.Item>
        )}
      </Form>
    </FormModal>
  );
}
