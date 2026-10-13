import type { ReactNode } from 'react';
import { Card } from 'antd';

interface OrderInfoCardProps {
  icon: ReactNode;
  title: ReactNode;
  children: ReactNode;
}

/** Khung thẻ thống nhất của drawer chi tiết đơn: tiêu đề in hoa kèm icon nhấn. */
export function OrderInfoCard({ icon, title, children }: OrderInfoCardProps) {
  return (
    <Card
      size="small"
      title={
        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
          <span className="text-emerald-600">{icon}</span>
          {title}
        </div>
      }
      className="rounded-xl border-slate-200 shadow-xs"
    >
      {children}
    </Card>
  );
}

interface OrderInfoRowProps {
  label: ReactNode;
  children: ReactNode;
  /** Vạch ngăn nhóm phía trên dòng. */
  divided?: boolean;
  valueClassName?: string;
}

export function OrderInfoRow({ label, children, divided, valueClassName = 'text-slate-700' }: OrderInfoRowProps) {
  return (
    <div className={`flex items-center justify-between gap-2${divided ? ' border-t border-slate-100 pt-2' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`text-right ${valueClassName}`}>{children}</span>
    </div>
  );
}
