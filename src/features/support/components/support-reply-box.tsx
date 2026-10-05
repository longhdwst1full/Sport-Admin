import { useState } from 'react';
import { LockOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Switch } from 'antd';
import { SUPPORT_LIMITS } from '../constants/support.constants';

/**
 * Ô trả lời khách / ghi chú nội bộ.
 *
 * UX: nội dung chỉ xoá khi lệnh thành công (`onSubmit` resolve true); lỗi giữ nguyên để người dùng gửi
 * lại, và gửi lại đúng nội dung thì dùng lại Idempotency-Key cũ nên không nhân đôi tin.
 */
export function SupportReplyBox({
  disabled,
  disabledReason,
  submitting,
  onSubmit,
}: {
  disabled: boolean;
  disabledReason?: string;
  submitting: boolean;
  onSubmit: (reply: { body: string; isInternal: boolean }) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || disabled) return;
    if (await onSubmit({ body: trimmed, isInternal: internal })) setBody('');
  };

  return (
    <div className={`space-y-2 rounded-2xl border p-3 ${internal ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}>
      {disabledReason && <Alert type="info" showIcon message={disabledReason} />}
      <Input.TextArea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        disabled={disabled}
        maxLength={SUPPORT_LIMITS.MESSAGE_MAX}
        showCount
        autoSize={{ minRows: 3, maxRows: 8 }}
        placeholder={internal ? 'Ghi chú chỉ nhân viên thấy…' : 'Trả lời khách hàng…'}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Switch size="small" checked={internal} onChange={setInternal} disabled={disabled} />
          <LockOutlined className={internal ? 'text-amber-600' : 'text-slate-400'} />
          Ghi chú nội bộ
        </label>
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          disabled={disabled || !trimmed}
          onClick={() => void submit()}
        >
          {internal ? 'Lưu ghi chú' : 'Gửi trả lời'}
        </Button>
      </div>
    </div>
  );
}
