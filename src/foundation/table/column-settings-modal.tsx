import { CheckOutlined, CloseOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Switch, Typography } from 'antd';

export interface ColumnItem<TId extends string = string> {
  id: TId;
  label: string;
  description?: string;
  fixed?: boolean;
}

export interface ColumnSettingsModalProps<TId extends string = string> {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem<TId>[];
  visibility: Record<TId, boolean>;
  onChange: (nextVisibility: Record<TId, boolean>) => void;
  onReset?: () => void;
  title?: string;
}

/**
 * Reusable Column Settings Modal for Admin Tables.
 * Allows operators to show/hide table columns according to their workflow.
 * Inspired by dragon-admin-web foundation table configuration.
 */
export function ColumnSettingsModal<TId extends string = string>({
  isOpen,
  onClose,
  columns,
  visibility,
  onChange,
  onReset,
  title = 'Tùy chỉnh cột hiển thị',
}: ColumnSettingsModalProps<TId>) {
  const visibleCount = columns.filter((col) => visibility[col.id] !== false).length;

  const handleToggle = (id: TId, checked: boolean) => {
    // Prevent hiding the very last visible column
    if (!checked && visibleCount <= 1) {
      return;
    }
    onChange({
      ...visibility,
      [id]: checked,
    });
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    columns.forEach((col) => {
      next[col.id] = true;
    });
    onChange(next as Record<TId, boolean>);
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <SettingOutlined className="text-sm" />
          </div>
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
      }
      footer={[
        <Button key="reset" icon={<UndoOutlined />} onClick={onReset}>
          Mặc định
        </Button>,
        <Button key="all" onClick={handleSelectAll}>
          Hiện tất cả
        </Button>,
        <Button key="done" type="primary" onClick={onClose}>
          Hoàn tất ({visibleCount}/{columns.length})
        </Button>,
      ]}
      width={460}
    >
      <div className="my-2">
        <Typography.Text type="secondary" className="text-xs">
          Bật hoặc tắt các cột để tối ưu hóa không gian làm việc của bạn.
        </Typography.Text>
      </div>

      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
        {columns.map((col) => {
          const isChecked = visibility[col.id] !== false;
          return (
            <div
              key={col.id}
              className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">
                  {col.label}
                  {col.fixed && (
                    <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Cố định
                    </span>
                  )}
                </span>
                {col.description && (
                  <span className="text-xs text-slate-400">{col.description}</span>
                )}
              </div>

              <Switch
                size="small"
                checked={isChecked}
                disabled={col.fixed}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
                onChange={(checked) => handleToggle(col.id, checked)}
              />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
