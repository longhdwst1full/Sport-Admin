import { Card, Col, Row } from 'antd';

/**
 * Shimmer skeleton matching the ManagementPage layout pattern.
 * Use as a Suspense fallback or during initial data loading.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded dctd-shimmer" />
        <div className="h-8 w-64 rounded-lg dctd-shimmer" />
        <div className="h-4 w-96 rounded dctd-shimmer" />
      </div>

      {/* Metric cards skeleton */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map((key) => (
          <Col xs={24} sm={12} xl={6} key={key}>
            <Card className="!rounded-2xl !border-slate-100">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-3 w-20 rounded dctd-shimmer" />
                  <div className="h-8 w-16 rounded-lg dctd-shimmer" />
                  <div className="h-3 w-28 rounded dctd-shimmer" />
                </div>
                <div className="size-11 rounded-xl dctd-shimmer" />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table skeleton */}
      <Card className="!rounded-2xl !border-slate-100">
        {/* Filter bar */}
        <div className="flex gap-3 border-b border-slate-100 p-5">
          <div className="h-10 w-72 rounded-xl dctd-shimmer" />
          <div className="h-10 w-28 rounded-xl dctd-shimmer" />
        </div>
        {/* Table header */}
        <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3">
          {[120, 200, 80, 100, 80].map((w, i) => (
            <div key={i} className="h-3 rounded dctd-shimmer" style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-4">
            <div className="size-10 rounded-lg dctd-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded dctd-shimmer" />
              <div className="h-3 w-32 rounded dctd-shimmer" />
            </div>
            <div className="h-4 w-20 rounded dctd-shimmer" />
            <div className="h-6 w-16 rounded-full dctd-shimmer" />
            <div className="h-8 w-20 rounded-lg dctd-shimmer" />
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Compact skeleton for chart areas */
export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="animate-fade-in rounded-2xl dctd-shimmer" style={{ height }} />
  );
}
