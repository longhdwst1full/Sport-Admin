import { useEffect } from 'react';
import { Alert, Form, Modal, Radio } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { KnowledgeAudience } from '@/generated/api/assistant/assistant.schemas';
import {
  ALL_BRANCHES_LABEL,
  CMS_POST_VIEW_PERMISSION,
  knowledgeAudiencePresentation,
} from '../constants/knowledge.constants';
import type { AttachKnowledgePostInput } from '../model/knowledge-document.types';
import { CmsPostSelect } from './cms-post-select';
import { KnowledgeBranchSelect } from './knowledge-branch-select';

interface FormValues {
  postId?: string;
  audience?: KnowledgeAudience;
  branchId?: string;
}

/**
 * Gắn một bài CMS vào kho tri thức với đối tượng xem + phạm vi chi nhánh. Tài liệu mới ở trạng thái nháp;
 * phải xuất bản riêng thì trợ lý mới dùng.
 *
 * UX: modal chỉ đóng khi lệnh thành công (component cha gọi `onClose`); lỗi giữ nguyên lựa chọn.
 */
export function AttachKnowledgePostModal({
  open,
  submitting,
  onSubmit,
  onClose,
}: {
  open: boolean;
  submitting: boolean;
  onSubmit: (input: AttachKnowledgePostInput) => void;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  // PERMISSION: chọn bài đọc qua `listAdminPosts` (đòi `cms.content.view`); thiếu quyền thì nói rõ thay vì
  // để ô chọn nhận 403.
  const canReadPosts = useCan(CMS_POST_VIEW_PERMISSION);

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const submit = (values: FormValues) => {
    if (!values.postId || !values.audience) return;
    onSubmit({ postId: values.postId, audience: values.audience, branchId: values.branchId || undefined });
  };

  return (
    <Modal
      open={open}
      title="Gắn bài CMS vào tri thức trợ lý"
      okText="Gắn bài"
      cancelText="Huỷ"
      okButtonProps={{ disabled: !canReadPosts }}
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
      width={640}
    >
      {!canReadPosts && (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          message={`Cần quyền xem bài viết (${CMS_POST_VIEW_PERMISSION}) để chọn bài CMS.`}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={submitting}
        initialValues={{ audience: KnowledgeAudience.PUBLIC }}
      >
        <Form.Item name="postId" label="Bài viết CMS" rules={[{ required: true, message: 'Chọn bài viết' }]}>
          <CmsPostSelect disabled={submitting || !canReadPosts} />
        </Form.Item>
        <Form.Item name="audience" label="Đối tượng được trợ lý trả lời" rules={[{ required: true, message: 'Chọn đối tượng' }]}>
          <Radio.Group className="flex flex-col gap-1">
            {Object.entries(knowledgeAudiencePresentation).map(([value, presentation]) => (
              <Radio key={value} value={value}>
                <strong>{presentation.label}</strong>
                <span className="ml-2 text-xs text-slate-500">{presentation.hint}</span>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item name="branchId" label="Chi nhánh áp dụng" extra={`Bỏ trống = ${ALL_BRANCHES_LABEL.toLowerCase()}.`}>
          <KnowledgeBranchSelect placeholder={ALL_BRANCHES_LABEL} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
