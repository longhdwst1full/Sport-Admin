import { PlusOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { EmailTemplateVariable } from '../model/email-template.mapper';

export interface EmailTemplateVariableChipsProps {
  variables: EmailTemplateVariable[];
  /** Ô đang nhận biến (ô vừa được focus gần nhất). */
  targetLabel: string;
  disabled?: boolean;
  onInsert: (token: string) => void;
}

/** "Chèn biến": mỗi biến một nút, nhãn tiếng Việt + mã biến; tooltip cho thấy giá trị mẫu. */
export function EmailTemplateVariableChips({ variables, targetLabel, disabled, onInsert }: EmailTemplateVariableChipsProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">Chèn biến</span>
        <span className="text-[11px] text-slate-400">Chèn vào: {targetLabel}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {variables.map((variable) => (
          <Tooltip
            key={variable.name}
            title={
              <span>
                Ví dụ khi gửi: <strong>{variable.example || '—'}</strong>
                {variable.isMoney && <div className="text-[11px] opacity-80">Tự định dạng tiền Việt</div>}
              </span>
            }
          >
            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={disabled}
              // UX: giữ focus/vùng chọn của ô đang soạn — mousedown trên nút mặc định cướp focus khỏi ô nhập.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onInsert(variable.token)}
            >
              {variable.label}
              <code className="ml-1 text-[11px] text-slate-400">{variable.token}</code>
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
