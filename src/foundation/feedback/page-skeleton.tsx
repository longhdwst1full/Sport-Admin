import { Skeleton } from 'antd';

/** Skeleton cho drawer/thẻ chi tiết: tiêu đề + các dòng mô tả, giữ bố cục thay vì Spin chặn cả khối. */
export function DetailSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6" data-testid="detail-skeleton">
      <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 2 }} />
      <Skeleton active title={false} paragraph={{ rows }} />
    </div>
  );
}

/** Skeleton cho bảng nhỏ trong drawer/thẻ (bảng chính dùng `loading` của AdminTable). */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" data-testid="table-skeleton">
      <Skeleton.Input active block size="small" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton.Input key={index} active block />
      ))}
    </div>
  );
}

/** Skeleton cho cả trang khi chưa có khung (route lazy, quyền đang tải). */
export function PageSkeleton() {
  return (
    <div className="space-y-6" data-testid="page-skeleton">
      <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 1 }} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton.Node key={index} active className="!h-24 !w-full" />
        ))}
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
