import { Empty, Skeleton } from 'antd';
import { Suspense, type ReactNode } from 'react';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import type { ReportQueryState } from '../model/dashboard.mapper';

type CardTone = 'default' | 'amber';

const TONE_CLASS: Record<CardTone, { shell: string; icon: string }> = {
  default: {
    shell: 'border-slate-200/80 bg-white',
    icon: 'bg-admin-50 text-admin-700 ring-admin-100',
  },
  amber: {
    shell: 'border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40',
    icon: 'bg-amber-100 text-amber-700 ring-amber-200',
  },
};

interface DashboardCardProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: CardTone;
  /** Hành động bên phải tiêu đề (tải báo cáo, nhãn tổng). */
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Vỏ thẻ dùng chung cho mọi khối của Dashboard: cùng radius, viền, bóng, padding và header. */
export function DashboardCard({
  title,
  description,
  icon,
  tone = 'default',
  extra,
  className = '',
  children,
}: DashboardCardProps) {
  const classes = TONE_CLASS[tone];
  return (
    <section
      className={`flex h-full min-w-0 flex-col rounded-2xl border shadow-card ${classes.shell} ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${classes.icon}`}
              aria-hidden
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="m-0 text-[15px] font-semibold leading-6 text-slate-900">{title}</h3>
            {description && <p className="m-0 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
        </div>
        {extra && <div className="flex shrink-0 flex-wrap items-center gap-2">{extra}</div>}
      </header>
      {/* flex + min-h-0: nội dung (bảng) co giãn theo chiều cao còn lại của thẻ. */}
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">{children}</div>
    </section>
  );
}

interface CardStateBodyProps {
  state: Pick<ReportQueryState, 'isPending' | 'isError' | 'error' | 'retry'>;
  /** PERMISSION: thiếu quyền thì không gọi API; thẻ nói lý do thay vì hiện số 0. */
  deniedText?: string;
  isEmpty: boolean;
  emptyText: string;
  /** Chiều cao tối thiểu chung cho mọi trạng thái để thẻ không giật khi dữ liệu về. */
  minHeight?: number;
  /** Khung chờ riêng (bảng); mặc định là `Skeleton` đoạn văn. */
  skeleton?: ReactNode;
  children: ReactNode;
}

/**
 * Một chuỗi trạng thái cho mọi thẻ: thiếu quyền → lỗi → đang tải → rỗng → nội dung.
 * Nội dung bọc `Suspense` vì phần lớn là biểu đồ nạp lười; fallback trùng khung chờ dữ liệu.
 */
export function CardStateBody({
  state,
  deniedText,
  isEmpty,
  emptyText,
  minHeight,
  skeleton,
  children,
}: CardStateBodyProps) {
  const placeholder = skeleton ?? <Skeleton active paragraph={{ rows: 5 }} />;
  const center = (node: ReactNode) => <div className="grid flex-1 place-items-center">{node}</div>;
  let content: ReactNode;
  if (deniedText)
    content = center(<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={deniedText} />);
  else if (state.isError) content = <QueryErrorAlert error={state.error} retry={state.retry} />;
  else if (state.isPending) content = placeholder;
  else if (isEmpty)
    content = center(<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />);
  else content = <Suspense fallback={placeholder}>{children}</Suspense>;
  return (
    <div className="flex min-h-0 flex-1 flex-col" style={minHeight ? { minHeight } : undefined}>
      {content}
    </div>
  );
}
