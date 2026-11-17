import { useQueryClient } from '@tanstack/react-query';
import { App, Button } from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getGetAdminReportOverviewQueryKey } from '@/generated/api/reporting/reporting';
import { useOrderLiveSummary } from '../hooks/use-order-live-summary';

/** Tiếng "ting" ngắn tự tạo bằng Web Audio: không cần file âm thanh, trình duyệt chặn thì bỏ qua. */
function playChime(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(1320, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    oscillator.onended = () => void context.close();
  } catch {
    // Trình duyệt chưa cho phát âm thanh (chưa có tương tác) — toast vẫn hiện.
  }
}

/** Thông báo hệ điều hành khi tab đang ẩn và người dùng đã cho phép; không tự xin quyền giữa chừng. */
function showSystemNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (document.visibilityState !== 'hidden') return;
  try {
    new Notification(title, { body, tag: 'admin-new-order' });
  } catch {
    // Một số trình duyệt (Android) chỉ cho tạo thông báo qua service worker — bỏ qua.
  }
}

/**
 * Báo đơn web mới trong Admin: toast + tiếng "ting" + thông báo hệ điều hành (khi tab ẩn), rồi làm mới danh
 * sách đơn và KPI dashboard. Không vẽ gì; gắn một lần ở layout cho người có quyền `order.view`.
 *
 * Mốc so sánh là `latestWebOrder.id` của lần hỏi ĐẦU TIÊN (lúc mở Admin): đơn đã có từ trước không bị báo.
 * Nhiều đơn vào giữa hai lần hỏi thì báo một lần với đơn mới nhất; số đơn chờ xác nhận trên menu cho biết tổng.
 * Mỗi tab Admin báo riêng (không đồng bộ giữa các tab).
 */
export function OrderLiveWatcher() {
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summary = useOrderLiveSummary(true);
  const lastSeenId = useRef<string | null | undefined>(undefined);

  const latest = summary.data?.latestWebOrder ?? null;
  const latestId = latest?.id ?? null;

  useEffect(() => {
    if (!summary.isSuccess) return;
    if (lastSeenId.current === undefined) {
      lastSeenId.current = latestId;
      return;
    }
    if (!latest || latestId === lastSeenId.current) return;
    lastSeenId.current = latestId;

    const description = `Mã đơn ${latest.orderNo}. Mở để xác nhận và liên hệ khách.`;
    notification.info({
      key: 'admin-new-order',
      message: '🛒 Có đơn hàng mới',
      description,
      placement: 'topRight',
      duration: 10,
      btn: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            notification.destroy('admin-new-order');
            navigate(`/orders?orderNo=${encodeURIComponent(latest.orderNo)}&open=1`);
          }}
        >
          Xem đơn
        </Button>
      ),
    });
    playChime();
    showSystemNotification('Có đơn hàng mới', description);
    void queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetAdminReportOverviewQueryKey() });
  }, [summary.isSuccess, latest, latestId, notification, navigate, queryClient]);

  return null;
}
