import { RealtimeClient, type RealtimeChannel } from '@supabase/realtime-js';
import { createCoalescedTrigger } from './coalesce';

/**
 * CONTRACT: khớp `scripts/configure-realtime-ping-trigger.cjs` của API (`REALTIME_TOPIC`, `REALTIME_EVENT`).
 * Trigger DB phát tín hiệu RỖNG lên kênh công khai này mỗi khi có sự kiện cho nhân viên (đơn web mới, ảnh chuyển
 * khoản, VNPay thành công, khách huỷ đơn, phiếu hỗ trợ). Tín hiệu không mang dữ liệu: nhận được thì gọi lại API
 * (có xác thực, theo phạm vi chi nhánh) để lấy số liệu thật.
 *
 * Nhịp tim: pg_cron của DB phát sự kiện `heartbeat` (rỗng) lên CÙNG kênh mỗi 5 phút, nhưng CHỈ khi trigger báo đơn đã
 * cài và `realtime.send` chạy được. Nên còn nhận nhịp tim = cả đường DB → Realtime → tab này đang khoẻ (trạng thái
 * `live`); kênh chỉ "đang nối" thì không chứng minh được tín hiệu đơn không rơi âm thầm.
 */
export const STAFF_ALERT_TOPIC = 'dctd-staff-alerts';
export const STAFF_ALERT_EVENT = 'staff-alert';
export const STAFF_ALERT_HEARTBEAT_EVENT = 'heartbeat';
/** Nhịp tim 5 phút/lần: quá 12 phút (lỡ 2 nhịp + biên trễ mạng/cron) không nhận thì không còn coi là `live`. */
export const STAFF_ALERT_HEARTBEAT_STALE_MS = 12 * 60_000;

/** Khoảng tối thiểu giữa hai lần báo cho người nghe (chặn tín hiệu giả/dồn dập, xem `createCoalescedTrigger`). */
export const STAFF_ALERT_MIN_INTERVAL_MS = 5_000;

/**
 * `connected` = kênh đã SUBSCRIBED nhưng chưa (hoặc quá lâu không) nhận nhịp tim; `live` = SUBSCRIBED VÀ có nhịp tim
 * trong `STAFF_ALERT_HEARTBEAT_STALE_MS` — chỉ lúc đó mới chắc tín hiệu đơn tới được tab.
 */
export type StaffAlertStatus = 'unavailable' | 'connecting' | 'connected' | 'live' | 'disconnected';

type Listener = () => void;

interface ChannelConfig {
  url: string;
  anonKey: string;
}

/** Kết nối dùng chung cho cả tab: nhiều component cùng nghe thì chỉ mở MỘT WebSocket. */
let client: RealtimeClient | undefined;
let channel: RealtimeChannel | undefined;
let status: StaffAlertStatus = 'unavailable';
const alertListeners = new Set<Listener>();
const statusListeners = new Set<Listener>();
let alertTrigger: ReturnType<typeof createCoalescedTrigger> | undefined;
/** Một timer duy nhất: hết hạn thì hạ `live` → `connected` (nhịp tim ngừng = đường ống có thể đã gãy). */
let heartbeatStaleTimer: ReturnType<typeof setTimeout> | undefined;
let subscribed = false;

function readConfig(): ChannelConfig | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : undefined;
}

function setStatus(next: StaffAlertStatus): void {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener());
}

function notifyAlert(): void {
  alertListeners.forEach((listener) => listener());
}

function clearHeartbeatStaleTimer(): void {
  if (heartbeatStaleTimer !== undefined) clearTimeout(heartbeatStaleTimer);
  heartbeatStaleTimer = undefined;
}

function onHeartbeat(): void {
  // Nhịp tim tới trước SUBSCRIBED (hiếm, callback lệch thứ tự) chưa chứng minh kênh nghe được: chờ lần sau.
  if (!subscribed) return;
  setStatus('live');
  clearHeartbeatStaleTimer();
  heartbeatStaleTimer = setTimeout(() => {
    heartbeatStaleTimer = undefined;
    if (subscribed) setStatus('connected');
  }, STAFF_ALERT_HEARTBEAT_STALE_MS);
}

function connect(config: ChannelConfig): void {
  setStatus('connecting');
  alertTrigger = createCoalescedTrigger(notifyAlert, STAFF_ALERT_MIN_INTERVAL_MS);
  client = new RealtimeClient(`${config.url.replace(/^http/i, 'ws')}/realtime/v1`, {
    params: { apikey: config.anonKey },
  });
  const created = client.channel(STAFF_ALERT_TOPIC, { config: { broadcast: { self: false } } });
  channel = created;
  created
    .on('broadcast', { event: STAFF_ALERT_EVENT }, () => {
      if (channel === created) alertTrigger?.trigger();
    })
    // Nhịp tim KHÔNG báo người nghe: không có gì đổi, gọi API là phí.
    .on('broadcast', { event: STAFF_ALERT_HEARTBEAT_EVENT }, () => {
      if (channel !== created) return;
      onHeartbeat();
    })
    .subscribe((state) => {
      // Callback trễ của kênh đã gỡ (ngắt rồi nối lại nhanh, StrictMode mount 2 lần) không được ghi đè trạng
      // thái của kênh hiện tại — nếu không, kênh mới đang nối vẫn bị coi là đứt (hoặc ngược lại).
      if (channel !== created) return;
      if (state === 'SUBSCRIBED') {
        subscribed = true;
        // (Nối lại) chưa có nhịp tim mới thì chưa biết đường ống còn khoẻ: `connected`, chờ nhịp tim kế để lên `live`.
        clearHeartbeatStaleTimer();
        setStatus('connected');
        // Tín hiệu phát lúc mất kết nối không được gửi lại: vừa (nối lại) thì hỏi API một lần cho chắc.
        alertTrigger?.trigger();
      } else {
        subscribed = false;
        clearHeartbeatStaleTimer();
        setStatus('disconnected');
      }
    });
}

function disconnect(): void {
  alertTrigger?.cancel();
  alertTrigger = undefined;
  subscribed = false;
  clearHeartbeatStaleTimer();
  const activeClient = client;
  const activeChannel = channel;
  client = undefined;
  channel = undefined;
  if (activeClient && activeChannel) void activeClient.removeChannel(activeChannel);
  void activeClient?.disconnect();
  setStatus(readConfig() ? 'disconnected' : 'unavailable');
}

/**
 * Nghe tín hiệu "có việc mới cho nhân viên". Trả hàm huỷ. Thiếu `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` thì
 * không làm gì (trạng thái `unavailable`) và nơi gọi tự rơi về polling.
 *
 * Đếm tham chiếu: người nghe đầu tiên mở kết nối, người cuối cùng đóng (đăng xuất/rời layout thì ngắt WebSocket).
 */
export function subscribeStaffAlerts(onAlert: Listener): () => void {
  const config = readConfig();
  if (!config) return () => undefined;
  alertListeners.add(onAlert);
  if (!client) connect(config);
  return () => {
    alertListeners.delete(onAlert);
    if (alertListeners.size === 0) disconnect();
  };
}

/** Cho `useSyncExternalStore`: trạng thái kết nối và cách theo dõi nó. */
export function getStaffAlertStatus(): StaffAlertStatus {
  return status;
}

export function onStaffAlertStatusChange(listener: Listener): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}
