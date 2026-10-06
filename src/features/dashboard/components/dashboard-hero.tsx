import { CalendarOutlined, GlobalOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

const todayLabel = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
}).format(new Date());

interface DashboardHeroProps {
  displayName: string;
  scopeLabel: string;
}

export function DashboardHero({ displayName, scopeLabel }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-admin-950 via-admin-800 to-admin-600 px-5 py-6 text-white shadow-lg shadow-admin-900/10 sm:px-7 sm:py-7">
      <div
        className="absolute -right-16 -top-24 size-64 rounded-full border-[44px] border-white/5"
        aria-hidden
      />
      <div
        className="absolute -bottom-24 right-1/4 size-52 rounded-full bg-emerald-300/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.12)]" />
            Bảo An Sport · Trung tâm vận hành
          </div>
          <Typography.Title level={2} className="!mb-2 !text-white">
            Chào {displayName}
          </Typography.Title>
          <p className="mb-0 max-w-2xl text-sm leading-6 text-emerald-50/80">
            Theo dõi doanh thu, đơn hàng và tồn kho trong 30 ngày gần nhất. Doanh thu chỉ ghi nhận
            khi đơn đã hoàn tất và đã trừ tiền hoàn cho khách; đơn đã giao chờ hoàn tất được tính vào dự thu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
            <CalendarOutlined />
            <span className="capitalize">{todayLabel}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
            <GlobalOutlined />
            {scopeLabel}
          </span>
        </div>
      </div>
    </section>
  );
}
