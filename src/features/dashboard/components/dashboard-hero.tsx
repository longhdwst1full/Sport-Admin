import { CalendarOutlined, GlobalOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import {
  GRANULARITY_OPTIONS,
  PERIOD_DESCRIPTION,
  type Granularity,
} from '../constants/dashboard.constants';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** antd `Segmented` cần mảng mutable; sao chép một lần ở module. */
const SEGMENT_OPTIONS = [...GRANULARITY_OPTIONS];

function greetingFor(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

interface DashboardHeroProps {
  displayName: string;
  scopeLabel: string;
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
}

/**
 * Lời chào, phạm vi dữ liệu và bộ chọn kỳ. Bộ chọn đặt ở đây vì nó đổi đồng thời thẻ doanh thu,
 * hai biểu đồ theo kỳ và hai bảng xếp hạng; các khối tổng quan 30 ngày/hiện tại ghi kỳ riêng.
 * Ngày và lời chào theo giờ Việt Nam, cùng múi với cách Backend cắt kỳ.
 */
export function DashboardHero({
  displayName,
  scopeLabel,
  granularity,
  onGranularityChange,
}: DashboardHeroProps) {
  const now = new Date();
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-admin-950 via-admin-800 to-admin-600 px-5 py-5 text-white shadow-card sm:px-6">
      <div
        className="absolute -right-16 -top-24 size-64 rounded-full border-[44px] border-white/5"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-bold leading-tight text-white sm:text-2xl">
            {greetingFor(Number(hourFormatter.format(now)))}, {displayName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-emerald-50/90">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
              <CalendarOutlined />
              <span className="first-letter:uppercase">{dateFormatter.format(now)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
              <GlobalOutlined />
              {scopeLabel}
            </span>
          </div>
          <p className="mb-0 mt-3 max-w-2xl text-[13px] leading-5 text-emerald-50/75">
            Doanh thu chỉ ghi nhận khi đơn đã hoàn tất và đã trừ tiền hoàn; đơn đã giao chờ hoàn tất
            tính vào dự thu.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 lg:items-end">
          <span id="dashboard-period-label" className="text-xs text-emerald-50/80">
            Kỳ báo cáo · {PERIOD_DESCRIPTION[granularity]}
          </span>
          <Segmented<Granularity>
            aria-labelledby="dashboard-period-label"
            value={granularity}
            options={SEGMENT_OPTIONS}
            onChange={onGranularityChange}
          />
        </div>
      </div>
    </section>
  );
}
