import { Progress, Tag } from 'antd';
import { List, type RowComponentProps } from 'react-window';
import type { SystemModuleDto } from '@/generated/api/system/models/systemModuleDto';

type ModuleRowProps = { items: SystemModuleDto[] };

function ModuleRow({ index, style, ariaAttributes, items }: RowComponentProps<ModuleRowProps>) {
  const item = items[index];
  const total = item.p0Count + item.p1Count;
  const isActive = item.status === 'ACTIVE';

  return (
    <div
      {...ariaAttributes}
      style={style}
      className="group grid grid-cols-[minmax(180px,1fr)_140px_80px_80px_120px] items-center gap-3 border-b border-slate-50 px-4 transition-colors hover:bg-slate-50/60"
    >
      {/* Module info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block size-2 rounded-full ${
              isActive ? 'bg-emerald-400' : 'bg-slate-300'
            }`}
          />
          <strong className="text-sm text-slate-800">{item.name}</strong>
        </div>
        <div className="ml-4 truncate text-xs text-slate-400">{item.key}</div>
      </div>

      {/* Status */}
      <div>
        <Tag
          className="!rounded-full !border-0 !px-3 !text-xs !font-medium"
          color={isActive ? 'success' : 'default'}
        >
          {isActive ? '✓ Active' : '◦ Scaffold'}
        </Tag>
      </div>

      {/* P0 */}
      <div className="text-center">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-600">
          {item.p0Count}
        </span>
      </div>

      {/* P1 */}
      <div className="text-center">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-violet-50 text-sm font-bold text-violet-600">
          {item.p1Count}
        </span>
      </div>

      {/* Progress */}
      <div>
        <Progress
          percent={total > 0 ? Math.round((item.p0Count / total) * 100) : 0}
          size="small"
          strokeColor="#059669"
          trailColor="#f1f5f9"
          showInfo={false}
        />
        <div className="mt-0.5 text-[10px] text-slate-400">
          {total} bảng
        </div>
      </div>
    </div>
  );
}

function moduleRowKey(index: number, data: ModuleRowProps) {
  return data.items[index].key;
}

export function SystemModuleList({ items }: { items: SystemModuleDto[] }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <span className="text-3xl">📦</span>
        <span className="text-sm text-slate-400">Chưa có module nào.</span>
      </div>
    );
  }

  const height = Math.min(items.length * 72, 504);

  return (
    <div className="min-w-[640px]">
      {/* Header */}
      <div className="grid h-11 grid-cols-[minmax(180px,1fr)_140px_80px_80px_120px] items-center gap-3 rounded-t-xl bg-slate-50 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Module</span>
        <span>Trạng thái</span>
        <span className="text-center">P0</span>
        <span className="text-center">P1</span>
        <span>Tiến độ</span>
      </div>

      {/* Rows */}
      <List
        rowComponent={ModuleRow}
        rowCount={items.length}
        rowHeight={72}
        rowKey={moduleRowKey}
        rowProps={{ items }}
        style={{ height }}
      />
    </div>
  );
}
