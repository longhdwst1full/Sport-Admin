import { useGetAdminOrderLiveSummary } from '@/generated/api/orders/orders';

/** Tab đang mở: hỏi mỗi 30 giây. Tab ẩn: 60 giây — vẫn hỏi để kịp báo đơn mới, nhưng thưa hơn. */
export const ORDER_LIVE_POLL_VISIBLE_MS = 30_000;
export const ORDER_LIVE_POLL_HIDDEN_MS = 60_000;

function pollInterval(): number {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
    ? ORDER_LIVE_POLL_HIDDEN_MS
    : ORDER_LIVE_POLL_VISIBLE_MS;
}

/**
 * Số đơn mới/việc cần làm cho Admin, hỏi định kỳ (`getAdminOrderLiveSummary`, theo phạm vi chi nhánh).
 *
 * Mọi nơi gọi hook dùng chung một query key nên React Query chỉ chạy MỘT vòng hỏi dù layout (số trên menu)
 * và bộ báo đơn mới cùng dùng. Quay lại tab thì hỏi ngay thay vì chờ hết chu kỳ.
 */
export function useOrderLiveSummary(enabled: boolean) {
  return useGetAdminOrderLiveSummary({
    query: {
      enabled,
      refetchInterval: pollInterval,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      staleTime: 10_000,
      // Lỗi mạng chập chờn: giữ số cũ, lần hỏi sau tự thử lại; không bắn thông báo lỗi mỗi 30 giây.
      retry: false,
    },
  });
}
