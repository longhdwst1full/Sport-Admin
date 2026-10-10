import { Alert, Form, Input, Radio } from 'antd';
import type { ReconcileCopy } from '../constants/social-action-meta';
import { SOCIAL_LIMITS } from '../constants/social.constants';

const REASON_MIN_RULE = {
  min: SOCIAL_LIMITS.REASON_MIN,
  message: `Lý do tối thiểu ${SOCIAL_LIMITS.REASON_MIN} ký tự`,
};

const REQUIRED_REASON_RULES = [
  { required: true, whitespace: true, message: 'Nhập lý do (ghi vào nhật ký)' },
  REASON_MIN_RULE,
];

const OPTIONAL_REASON_RULES = [REASON_MIN_RULE];

/**
 * Ô lý do của lệnh từ chối/huỷ/xoá. `required` ghi vào nhật ký bắt buộc; `minWhenFilled` chỉ kiểm độ dài
 * tối thiểu khi có nhập (xoá bản chưa đăng); còn lại lý do hoàn toàn tuỳ chọn (huỷ bản đăng).
 */
export function SocialReasonField({ mode }: { mode: 'required' | 'minWhenFilled' | 'optional' }) {
  return (
    <Form.Item
      name="reason"
      label={mode === 'required' ? 'Lý do' : 'Lý do (tuỳ chọn)'}
      rules={mode === 'required' ? REQUIRED_REASON_RULES : mode === 'minWhenFilled' ? OPTIONAL_REASON_RULES : undefined}
    >
      <Input.TextArea rows={3} maxLength={SOCIAL_LIMITS.REASON_MAX} showCount />
    </Form.Item>
  );
}

/** Ba cách đối soát (tự hỏi lại, nhập id bài tìm thấy, xác nhận chưa đăng) dùng chung Facebook/TikTok. */
export function SocialReconcileFields({ copy, mode }: { copy: ReconcileCopy; mode?: string }) {
  return (
    <>
      <Form.Item name="reconcileMode" label="Cách đối soát">
        <Radio.Group className="flex flex-col gap-1">
          <Radio value="auto">{copy.auto}</Radio>
          <Radio value="postId">{copy.postId}</Radio>
          <Radio value="notPublished">{copy.notPublished}</Radio>
        </Radio.Group>
      </Form.Item>
      {mode === 'postId' && (
        <Form.Item
          name="externalPostId"
          label={copy.postIdLabel}
          extra={copy.postIdExtra}
          rules={[
            { required: true, message: copy.postIdRequired },
            { pattern: copy.postIdPattern, message: copy.postIdPatternMessage },
          ]}
        >
          <Input placeholder={copy.postIdPlaceholder} />
        </Form.Item>
      )}
      {mode === 'notPublished' && <Alert type="warning" showIcon className="mb-3" message={copy.notPublishedWarning} />}
    </>
  );
}
