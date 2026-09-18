import type { ReactNode } from 'react';
import { Skeleton } from 'antd';

type DashboardStatTone = 'brand' | 'blue' | 'violet' | 'amber' | 'rose';

const TONE_CLASSES: Record<DashboardStatTone, { accent: string; icon: string; glow: string }> = {
  brand: {
    accent: 'bg-admin-600',
    icon: 'bg-admin-50 text-admin-700 ring-admin-100',
    glow: 'bg-admin-300/20',
  },
  blue: {
    accent: 'bg-sky-500',
    icon: 'bg-sky-50 text-sky-700 ring-sky-100',
    glow: 'bg-sky-300/20',
  },
  violet: {
    accent: 'bg-violet-500',
    icon: 'bg-violet-50 text-violet-700 ring-violet-100',
    glow: 'bg-violet-300/20',
  },
  amber: {
    accent: 'bg-amber-500',
    icon: 'bg-amber-50 text-amber-700 ring-amber-100',
    glow: 'bg-amber-300/20',
  },
  rose: {
    accent: 'bg-rose-500',
    icon: 'bg-rose-50 text-rose-700 ring-rose-100',
    glow: 'bg-rose-300/20',
  },
};

interface DashboardStatCardProps {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
  tone: DashboardStatTone;
  loading?: boolean;
}

/**
 * KPI chỉ trình bày dữ liệu đã nhận từ API. Component không tự tính tăng trưởng để tránh biến
 * số minh hoạ thành số liệu vận hành thật trên Dashboard.
 */
export function DashboardStatCard({
  label,
  value,
  hint,
  icon,
  tone,
  loading = false,
}: DashboardStatCardProps) {
  const classes = TONE_CLASSES[tone];

  return (
    <article className="group relative min-h-36 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
      <span className={`absolute inset-x-0 top-0 h-1 ${classes.accent}`} aria-hidden />
      <span
        className={`absolute -right-8 -top-10 size-28 rounded-full blur-3xl transition group-hover:scale-125 ${classes.glow}`}
        aria-hidden
      />

      {loading ? (
        <div className="space-y-3" aria-label={`Đang tải ${label}`}>
          <Skeleton.Input active size="small" className="!w-32" />
          <Skeleton.Input active className="!h-9 !w-28" />
          <Skeleton.Input active size="small" className="!w-40" />
        </div>
      ) : (
        <div className="relative flex h-full items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {label}
            </p>
            <div className="mt-2 truncate text-[26px] font-bold leading-tight tracking-tight text-slate-950">
              {value}
            </div>
            <p className="mb-0 mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{hint}</p>
          </div>
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg ring-1 ring-inset ${classes.icon}`}
            aria-hidden
          >
            {icon}
          </span>
        </div>
      )}
    </article>
  );
}
