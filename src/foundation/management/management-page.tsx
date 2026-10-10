import type { ReactNode } from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { TableSurfaceProvider } from '@/foundation/table';

export interface ManagementMetric {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'red';
}

interface ManagementPageProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: ManagementMetric[];
  filters?: ReactNode;
  children: ReactNode;
}

const toneConfig: Record<
  NonNullable<ManagementMetric['tone']>,
  { iconBg: string; iconText: string; accent: string }
> = {
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-400',
    iconText: 'text-white',
    accent: 'var(--ba-blue-400)',
  },
  green: {
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-400',
    iconText: 'text-white',
    accent: 'var(--ba-green-500)',
  },
  orange: {
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-400',
    iconText: 'text-white',
    accent: 'var(--ba-yellow-400)',
  },
  red: {
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-400',
    iconText: 'text-white',
    accent: 'var(--ba-red-500)',
  },
};

const defaultToneConfig = {
  iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500',
  iconText: 'text-white',
  accent: 'var(--ba-ink-secondary)',
};

export function ManagementPage({
  eyebrow,
  title,
  description,
  actions,
  metrics = [],
  filters,
  children,
}: ManagementPageProps) {
  return (
    // Màn danh sách vừa khít chiều cao vùng nội dung: tiêu đề/số liệu/bộ lọc đứng yên, bảng lấp phần
    // còn lại và chỉ thân bảng cuộn. Màn quá thấp (< min-h) thì vùng nội dung của layout cuộn thay.
    <div className="flex min-h-[560px] flex-1 flex-col gap-6">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Typography.Text className="!text-[10px] !font-bold !tracking-[0.16em] !text-slate-400">
            {eyebrow.toUpperCase()}
          </Typography.Text>
          <Typography.Title level={2} className="!mb-1 !mt-1 !text-slate-900">
            {title}
          </Typography.Title>
          {description && (
            <Typography.Text className="!text-sm !text-slate-500">
              {description}
            </Typography.Text>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>


      {/* ── Metric cards ─────────────────────────────────── */}
      {metrics.length > 0 && (
        <Row gutter={[16, 16]} className="shrink-0">
          {metrics.map((metric) => {
            const config = toneConfig[metric.tone ?? 'blue'] ?? defaultToneConfig;
            return (
              <Col
                key={metric.key}
                xs={24}
                sm={metrics.length === 1 ? 24 : 12}
                md={metrics.length === 3 ? 8 : metrics.length === 2 ? 12 : 12}
                xl={metrics.length <= 4 ? 24 / metrics.length : 6}
                className="flex"
              >
                <Card
                  className="dctd-metric-card h-full w-full !rounded-2xl !border-slate-100"
                  style={{ '--metric-accent': config.accent } as React.CSSProperties}
                  styles={{ body: { height: '100%', padding: 20 } }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-500">
                        {metric.label}
                      </div>
                      <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                        {metric.value}
                      </div>
                      {metric.hint && (
                        <div className="mt-1.5 text-[11px] text-slate-400">
                          {metric.hint}
                        </div>
                      )}
                    </div>
                    {metric.icon && (
                      <span
                        className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg shadow-md ${config.iconBg} ${config.iconText}`}
                      >
                        {metric.icon}
                      </span>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ── Main content card ────────────────────────────── */}
      <Card
        className="flex min-h-0 flex-1 flex-col !rounded-2xl !border-slate-100"
        styles={{ body: { padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
      >
        {filters && (
          <div className="shrink-0 border-b border-slate-100 px-5 py-4 lg:px-6">
            {filters}
          </div>
        )}
        {/*
          Bảng trong vùng nội dung của một màn danh sách là bảng chính của màn đó: nó cao hết phần
          còn lại của màn hình. Khai ở đây một lần để mỗi màn không phải tự nhớ.
        */}
        <div className="dctd-fill flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-5 lg:p-6">
          <TableSurfaceProvider value="page">{children}</TableSurfaceProvider>
        </div>
      </Card>
    </div>
  );
}
