import { Drawer, type DrawerProps } from 'antd';
import type { ReactNode } from 'react';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DRAWER_WIDTH } from './drawer-width';

export interface DetailDrawerProps extends Omit<DrawerProps, 'width' | 'size' | 'extra' | 'loading'> {
  size?: keyof typeof DRAWER_WIDTH;
  /** Thẻ trạng thái cạnh tiêu đề (thường là `StatusTag`). */
  status?: ReactNode;
  /** Hành động chuyển trạng thái/sửa; luôn ở góc phải header. */
  actions?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

/**
 * Drawer xem chi tiết: tiêu đề + trạng thái, hành động ở `extra`, skeleton khi tải lần đầu và
 * `QueryErrorAlert` có "Thử lại" khi lỗi — cùng một khuôn cho mọi module.
 */
export function DetailDrawer({
  size = 'lg',
  title,
  status,
  actions,
  loading,
  error,
  onRetry,
  children,
  ...drawerProps
}: DetailDrawerProps) {
  return (
    <Drawer
      destroyOnHidden
      {...drawerProps}
      width={DRAWER_WIDTH[size]}
      title={
        status ? (
          <span className="flex flex-wrap items-center gap-2">
            {title}
            {status}
          </span>
        ) : (
          title
        )
      }
      extra={actions}
    >
      {error ? (
        <QueryErrorAlert error={error} retry={onRetry} />
      ) : loading ? (
        <DetailSkeleton />
      ) : (
        children
      )}
    </Drawer>
  );
}
