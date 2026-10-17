import { ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Tag, Tooltip, Typography } from 'antd';
import { OTHER_SYSTEM_PERMISSIONS_HINT, SENSITIVE_PERMISSION_HINT } from '../constants/role.constants';
import { UNMAPPED_GROUP_KEY, type PermissionTreeGroup, type PermissionTreeLeaf } from '../model/permission-tree';

function CountBadge({ value }: { value: number }) {
  return <span className="ml-2 rounded-full bg-slate-100 px-2 py-px text-xs font-medium text-slate-500">{value}</span>;
}

/** Tiêu đề nút nhóm menu; nhóm "Quyền hệ thống khác" có tooltip giải thích vì sao không gắn màn hình. */
export function PermissionGroupTitle({ group, count }: { group: PermissionTreeGroup; count?: number }) {
  return (
    <span className="font-semibold text-slate-800">
      {group.label}
      {group.key === UNMAPPED_GROUP_KEY && (
        <Tooltip title={OTHER_SYSTEM_PERMISSIONS_HINT}>
          <InfoCircleOutlined className="ml-1 text-slate-400" />
        </Tooltip>
      )}
      {count !== undefined && <CountBadge value={count} />}
    </span>
  );
}

export function PermissionScreenTitle({ label, count }: { label: string; count?: number }) {
  return (
    <span className="font-medium text-slate-700">
      {label}
      {count !== undefined && <CountBadge value={count} />}
    </span>
  );
}

/** Lá quyền: nhãn tiếng Việt, mã ở dạng monospace phụ, và cờ "Nhạy cảm" nhỏ có giải thích. */
export function PermissionLeafTitle({ item, muted = false }: { item: PermissionTreeLeaf; muted?: boolean }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 text-sm ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
      <span>{item.label}</span>
      <Typography.Text type="secondary" className="font-mono !text-xs">
        {item.code}
      </Typography.Text>
      {item.sensitive && (
        <Tooltip title={SENSITIVE_PERMISSION_HINT}>
          <Tag color="warning" bordered={false} className="!m-0 !px-1.5 !text-[11px] !leading-4" icon={<ExclamationCircleOutlined />}>
            Nhạy cảm
          </Tag>
        </Tooltip>
      )}
    </span>
  );
}
