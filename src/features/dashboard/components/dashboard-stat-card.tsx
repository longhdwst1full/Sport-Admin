import { ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { KpiStatus, KpiTone } from '../model/dashboard.mapper';

const TONE_CLASSES: Record<KpiTone, { accent: string; icon: string }> = {
  brand: { accent: 'bg-admin-600', icon: 'bg-admin-50 text-admin-700 ring-admin-100' },
  blue: { accent: 'bg-sky-500', icon: 'bg-sky-50 text-sky-700 ring-sky-100' },
  violet: { accent: 'bg-violet-500', icon: 'bg-violet-50 text-violet-700 ring-violet-100' },
  amber: { accent: 'bg-amber-500', icon: 'bg-amber-50 text-amber-700 ring-amber-100' },
  rose: { accent: 'bg-rose-500', icon: 'bg-rose-50 text-rose-700 ring-rose-100' },
};

interface DashboardStatCardProps {
  label: string;
  /** Kỳ số liệu (`Hôm nay`, `30 ngày gần nhất`...). */
  period: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: KpiTone;
  status?: KpiStatus;
  retry?: () => void;
  /** Có thì cả thẻ là link sang màn danh sách tương ứng (chỉ khi số liệu đã sẵn sàng). */
  href?: string;
}

/**
 * KPI chỉ trình bày dữ liệu đã nhận từ API. Component không tự tính tăng trưởng để tránh biến
 * số minh hoạ thành số liệu vận hành thật trên Dashboard.
 */
export function DashboardStatCard({
  label,
  period,
  value,
  hint,
  icon,
  tone,
  status = 'ready',
  retry,
  href,
}: DashboardStatCardProps) {
  const classes = TONE_CLASSES[tone];
  const linked = Boolean(href) && status === 'ready';
  const card = (
    <article
      className={`relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition duration-200 sm:p-5 ${
        linked
          ? 'group-hover:-translate-y-0.5 group-hover:border-slate-300 group-focus-visible:border-admin-400'
          : ''
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${classes.accent}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-[13px] font-medium text-slate-600">{label}</p>
          <p className="m-0 text-[11px] uppercase tracking-wide text-slate-400">{period}</p>
        </div>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl text-base ring-1 ring-inset ${classes.icon}`}
          aria-hidden
        >
          {icon}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="mt-3 space-y-2" aria-label={`Đang tải ${label}`}>
          <Skeleton.Input active className="!h-8 !w-32" />
          <Skeleton.Input active size="small" className="!w-40" />
        </div>
      ) : (
        <>
          <div
            className={`mt-3 text-2xl font-bold leading-tight tracking-tight tabular-nums [overflow-wrap:anywhere] ${
              status === 'ready' ? 'text-slate-950' : 'text-slate-300'
            }`}
            title={value}
          >
            {value}
          </div>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <p
              className={`m-0 line-clamp-2 text-xs leading-5 ${status === 'error' ? 'text-rose-600' : 'text-slate-500'}`}
            >
              {hint}
            </p>
            {status === 'error' && retry && (
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                onClick={retry}
                aria-label={`Tải lại ${label}`}
              >
                Thử lại
              </Button>
            )}
            {linked && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-admin-700 opacity-70 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                Xem chi tiết
                <ArrowRightOutlined className="text-[10px] transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>
        </>
      )}
    </article>
  );

  return linked && href ? (
    <Link
      to={href}
      aria-label={`Xem chi tiết ${label}`}
      className="group block h-full rounded-2xl text-inherit outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
