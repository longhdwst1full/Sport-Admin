import { useEffect } from 'react';
import { Alert, Descriptions, Form, Input, Modal, Select, Typography } from 'antd';
import { StatusTag } from '@/foundation/management';
import { supportCommandErrorMessage } from '../model/support-command-error';
import { SUPPORT_LIMITS, supportTicketStatusPresentation } from '../constants/support.constants';
import type { SupportTicketCommand } from '../hooks/use-support-ticket-command';
import { useSupportAssigneeOptions } from '../hooks/use-support-assignee-options';
import type { SupportTicketAction } from '../model/support-ticket-actions.policy';
import type { SupportTicketDetail } from '../model/support-ticket.types';

const titles: Record<SupportTicketAction, { title: string; okText: string; consequence: string }> = {
  assign: {
    title: 'Giao ticket',
    okText: 'Giao việc',
    consequence: 'Người được giao chịu trách nhiệm trả lời khách; ticket chuyển sang "Đang xử lý".',
  },
  resolve: {
    title: 'Đánh dấu đã giải quyết',
    okText: 'Đã giải quyết',
    consequence: 'Ticket chuyển sang "Đã giải quyết"; ghi chú giải quyết được lưu vào hồ sơ ticket.',
  },
  close: {
    title: 'Đóng ticket',
    okText: 'Đóng ticket',
    consequence: 'Ticket đã đóng chỉ còn đọc: không trả lời, ghi chú hay giao lại được nữa.',
  },
};

interface FormValues {
  assigneeUserId?: string;
  resolutionNote?: string;
}

/**
 * Một modal cho giao việc / giải quyết / đóng. Hiện trạng thái hiện tại, hành động và hệ quả trước khi
 * xác nhận (`04-permissions-transitions.md`). Modal chỉ đóng khi lệnh thành công; lỗi giữ nguyên dữ liệu.
 */
export function SupportTicketActionModal({
  ticket,
  action,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  ticket: SupportTicketDetail;
  action?: SupportTicketAction;
  submitting: boolean;
  error: unknown;
  onSubmit: (command: SupportTicketCommand) => void;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const assignees = useSupportAssigneeOptions(action === 'assign');

  useEffect(() => {
    if (!action) return;
    form.resetFields();
    form.setFieldsValue({ assigneeUserId: action === 'assign' ? ticket.assigneeUserId : undefined });
  }, [action, form, ticket.assigneeUserId]);

  if (!action) return null;
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
    <Modal
      open
      title={meta.title}
      okText={meta.okText}
      cancelText="Huỷ"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Descriptions size="small" column={1} className="mb-3">
        <Descriptions.Item label="Ticket">{ticket.ticketNo}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái hiện tại">
          <StatusTag status={ticket.status} presentations={supportTicketStatusPresentation} />
        </Descriptions.Item>
        {action === 'assign' && (
          <Descriptions.Item label="Đang giao cho">{ticket.assigneeName ?? 'Chưa giao'}</Descriptions.Item>
        )}
      </Descriptions>
      <Typography.Paragraph type="secondary">{meta.consequence}</Typography.Paragraph>
      {Boolean(error) && (
        <Alert className="mb-3" type="error" showIcon message="Không thực hiện được" description={supportCommandErrorMessage(error)} />
      )}
      <Form form={form} layout="vertical" onFinish={submit} disabled={submitting}>
        {action === 'assign' && (
          <Form.Item
            name="assigneeUserId"
            label="Người xử lý"
            rules={[{ required: true, message: 'Chọn người xử lý' }]}
            extra={assignees.limitedToSelf ? 'Bạn chỉ có thể tự nhận ticket vì không có quyền xem danh sách nhân sự.' : undefined}
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
    </Modal>
  );
}
