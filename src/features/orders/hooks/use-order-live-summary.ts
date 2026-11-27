import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetAdminRealtimeConfig } from '@/generated/api/system/system';
import { getListAdminNotificationsQueryKey } from '@/generated/api/notifications/notifications';
import { getGetAdminOrderLiveSummaryQueryKey, useGetAdminOrderLiveSummary } from '@/generated/api/orders/orders';
import {
  getStaffAlertStatus,
  onStaffAlertStatusChange,
  subscribeStaffAlerts,
  type StaffAlertStatus,
} from '@/lib/realtime/staff-alert-channel';

/** Tab đang mở: hỏi mỗi 30 giây. Tab ẩn: 60 giây — vẫn hỏi để kịp báo đơn mới, nhưng thưa hơn. */
export const ORDER_LIVE_POLL_VISIBLE_MS = 30_000;
export const ORDER_LIVE_POLL_HIDDEN_MS = 60_000;
/**
 * Kênh đã nối (`connected`) nhưng CHƯA có nhịp tim: polling vẫn là lưới an toàn 60 giây. Không thưa hơn: lúc này không phân
 * biệt được "không có đơn" với "tín hiệu rơi âm thầm" (trigger chưa cài/bị gỡ, `realtime.send` lỗi bị nuốt), nên đơn mới
 * vẫn phải được báo chậm nhất 60 giây.
 */
export const ORDER_LIVE_POLL_REALTIME_MS = 60_000;
/**
 * Kênh `live` (nhịp tim pg_cron còn tới): nhịp tim chỉ phát khi trigger đã cài và `realtime.send` chạy được, nên nó chứng
 * minh cả đường DB → Realtime → tab đang khoẻ. Tín hiệu đơn đã báo ngay, polling chỉ còn đối soát 10 phút/lần.
 */
export const ORDER_LIVE_POLL_HEARTBEAT_MS = 600_000;

/** Chu kỳ polling theo trạng thái Realtime và độ hiển thị tab (hàm thuần để test). */
export function orderLivePollInterval(status: StaffAlertStatus, hidden: boolean): number {
  if (status === 'live') return ORDER_LIVE_POLL_HEARTBEAT_MS;
  if (status === 'connected') return ORDER_LIVE_POLL_REALTIME_MS;
  return hidden ? ORDER_LIVE_POLL_HIDDEN_MS : ORDER_LIVE_POLL_VISIBLE_MS;
}

function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/**
 * Số đơn mới/việc cần làm cho Admin (`getAdminOrderLiveSummary`, theo phạm vi chi nhánh).
 *
 * Cập nhật tức thì nhờ Supabase Realtime: trigger DB phát tín hiệu rỗng khi có sự kiện cho nhân viên, hook nhận
 * thì làm mới query này. Thiếu cấu hình Realtime hoặc kênh đứt thì tự rơi về polling như cũ. Chu kỳ polling theo
 * `orderLivePollInterval`: có nhịp tim (`live`) thì 10 phút, chỉ nối mà chưa có nhịp tim thì 60 giây.
 *
 * Mọi nơi gọi hook dùng chung một query key nên React Query chỉ chạy MỘT vòng hỏi dù layout (số trên menu)
 * và bộ báo đơn mới cùng dùng; kết nối Realtime cũng dùng chung một WebSocket. Quay lại tab thì hỏi ngay.
 */
export function useOrderLiveSummary(enabled: boolean) {
  const queryClient = useQueryClient();
  const realtimeStatus = useSyncExternalStore(onStaffAlertStatusChange, getStaffAlertStatus);
  // CONFIG: địa chỉ + khoá công khai lấy từ tham số hệ thống (đổi không cần build lại). Chờ hỏi xong (kể cả lỗi) rồi mới
  // nối, để không mở kết nối bằng cấu hình dự phòng rồi lại đóng ngay khi có giá trị từ API.
  const realtimeConfig = useGetAdminRealtimeConfig({
    query: { enabled, staleTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false },
  });
  const configSettled = realtimeConfig.isSuccess || realtimeConfig.isError;
  const runtimeUrl = realtimeConfig.data?.url;
  const runtimeAnonKey = realtimeConfig.data?.anonKey;

  useEffect(() => {
    if (!enabled || !configSettled) return undefined;
    return subscribeStaffAlerts(() => {
      // `cancelRefetch: false`: nhiều nơi cùng nghe thì các lệnh trùng nhau gộp vào lượt đang chạy, không huỷ lẫn nhau.
      void queryClient.invalidateQueries(
        { queryKey: getGetAdminOrderLiveSummaryQueryKey() },
        { cancelRefetch: false },
      );
      // CACHE: đơn mới/thanh toán sinh thêm dòng email gửi khách trong hàng đợi thông báo. Chỉ query đang hiển thị
      // (`refetchType: 'active'`, mặc định) mới được tải lại nên không tốn gì khi màn đó đang đóng.
      void queryClient.invalidateQueries(
        { queryKey: getListAdminNotificationsQueryKey().slice(0, 1) },
        { cancelRefetch: false },
      );
    }, { url: runtimeUrl, anonKey: runtimeAnonKey });
  }, [enabled, configSettled, runtimeUrl, runtimeAnonKey, queryClient]);

  return useGetAdminOrderLiveSummary({
    query: {
      enabled,
      refetchInterval: () => orderLivePollInterval(realtimeStatus, isDocumentHidden()),
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      staleTime: 10_000,
      // Lỗi mạng chập chờn: giữ số cũ, lần hỏi sau tự thử lại; không bắn thông báo lỗi mỗi 30 giây.
      retry: false,
    },
  });
}
