import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SubscribeCallback = (state: string) => void;

/** Giả lập tối thiểu RealtimeClient/RealtimeChannel: ghi lại handler để test chủ động bắn tín hiệu. */
const fake = vi.hoisted(() => {
  const state = {
    instances: 0,
    url: '',
    options: undefined as unknown,
    topic: '',
    channelOptions: undefined as unknown,
    /** Handler theo tên sự kiện (`staff-alert`, `heartbeat`, ...). */
    handlers: new Map<string, () => void>(),
    onSubscribe: undefined as undefined | SubscribeCallback,
    removeChannel: vi.fn(),
    disconnect: vi.fn(),
  };
  class FakeRealtimeClient {
    constructor(url: string, options: unknown) {
      state.instances += 1;
      state.url = url;
      state.options = options;
    }
    channel(topic: string, options: unknown) {
      state.topic = topic;
      state.channelOptions = options;
      const channel = {
        on: (_type: string, filter: { event: string }, handler: () => void) => {
          state.handlers.set(filter.event, handler);
          return channel;
        },
        subscribe: (callback: SubscribeCallback) => {
          state.onSubscribe = callback;
          return channel;
        },
      };
      return channel;
    }
    removeChannel = state.removeChannel;
    disconnect = state.disconnect;
  }
  return { state, FakeRealtimeClient };
});

vi.mock('@supabase/realtime-js', () => ({ RealtimeClient: fake.FakeRealtimeClient }));

function emit(event: string) {
  fake.state.handlers.get(event)?.();
}

async function load() {
  return import('./staff-alert-channel');
}

describe('staff alert channel', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T08:00:00Z'));
    fake.state.instances = 0;
    fake.state.handlers.clear();
    fake.state.onSubscribe = undefined;
    fake.state.removeChannel.mockClear();
    fake.state.disconnect.mockClear();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co/');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('does nothing and stays unavailable without Supabase config (caller falls back to polling)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const channel = await load();
    const unsubscribe = channel.subscribeStaffAlerts(vi.fn());
    expect(fake.state.instances).toBe(0);
    expect(channel.getStaffAlertStatus()).toBe('unavailable');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('connects over wss with the anon key to the agreed topic/event, without echo to the sender', async () => {
    const channel = await load();
    channel.subscribeStaffAlerts(vi.fn());
    expect(fake.state.url).toBe('wss://abc.supabase.co/realtime/v1');
    expect(fake.state.options).toEqual({ params: { apikey: 'anon-key' } });
    expect(fake.state.topic).toBe(channel.STAFF_ALERT_TOPIC);
    expect([...fake.state.handlers.keys()]).toEqual([channel.STAFF_ALERT_EVENT, channel.STAFF_ALERT_HEARTBEAT_EVENT]);
    expect(fake.state.channelOptions).toEqual({ config: { broadcast: { self: false } } });
    expect(channel.getStaffAlertStatus()).toBe('connecting');
  });

  describe('cấu hình từ tham số hệ thống (API)', () => {
    it('tham số API thắng biến VITE_* lúc build', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn(), { url: 'https://param.supabase.co/', anonKey: 'param-key' });
      expect(fake.state.url).toBe('wss://param.supabase.co/realtime/v1');
      expect(fake.state.options).toEqual({ params: { apikey: 'param-key' } });
    });

    it('không có biến VITE_* vẫn nối được nhờ tham số API', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn(), { url: 'https://param.supabase.co', anonKey: 'param-key' });
      expect(fake.state.instances).toBe(1);
    });

    it('tham số API thiếu một nửa thì dùng nguyên cặp VITE_*, không trộn hai nguồn', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn(), { url: 'https://param.supabase.co', anonKey: '' });
      expect(fake.state.url).toBe('wss://abc.supabase.co/realtime/v1');
      expect(fake.state.options).toEqual({ params: { apikey: 'anon-key' } });
    });

    it('API chưa khai và không có VITE_* → không nối, trạng thái unavailable (rơi về polling)', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn(), { url: '', anonKey: '' });
      expect(fake.state.instances).toBe(0);
      expect(channel.getStaffAlertStatus()).toBe('unavailable');
    });
  });

  it('shares one connection between listeners and closes it only after the last one leaves', async () => {
    const channel = await load();
    const first = channel.subscribeStaffAlerts(vi.fn());
    const second = channel.subscribeStaffAlerts(vi.fn());
    expect(fake.state.instances).toBe(1);

    first();
    expect(fake.state.removeChannel).not.toHaveBeenCalled();
    second();
    expect(fake.state.removeChannel).toHaveBeenCalledTimes(1);
    expect(fake.state.disconnect).toHaveBeenCalledTimes(1);
  });

  it('notifies listeners on a broadcast and coalesces a burst of fake signals', async () => {
    const channel = await load();
    const listener = vi.fn();
    channel.subscribeStaffAlerts(listener);
    fake.state.onSubscribe?.('SUBSCRIBED');
    listener.mockClear(); // lượt hỏi bù ngay sau khi nối

    vi.advanceTimersByTime(6_000);
    for (let i = 0; i < 20; i += 1) emit('staff-alert');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('asks once after (re)connecting because signals sent while offline are not replayed', async () => {
    const channel = await load();
    const listener = vi.fn();
    channel.subscribeStaffAlerts(listener);
    fake.state.onSubscribe?.('SUBSCRIBED');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('tracks connection status for the polling fallback', async () => {
    const channel = await load();
    const changes = vi.fn();
    channel.onStaffAlertStatusChange(changes);
    channel.subscribeStaffAlerts(vi.fn());

    fake.state.onSubscribe?.('SUBSCRIBED');
    expect(channel.getStaffAlertStatus()).toBe('connected');
    fake.state.onSubscribe?.('CHANNEL_ERROR');
    expect(channel.getStaffAlertStatus()).toBe('disconnected');
    expect(changes).toHaveBeenCalled();
  });

  it('ignores late callbacks from a channel that was already torn down', async () => {
    const channel = await load();
    const first = channel.subscribeStaffAlerts(vi.fn());
    const staleSubscribe = fake.state.onSubscribe;
    first();
    channel.subscribeStaffAlerts(vi.fn());
    fake.state.onSubscribe?.('SUBSCRIBED');

    staleSubscribe?.('CLOSED');
    expect(channel.getStaffAlertStatus()).toBe('connected');
  });

  describe('heartbeat', () => {
    it('goes live on a heartbeat after SUBSCRIBED without notifying alert listeners', async () => {
      const channel = await load();
      const listener = vi.fn();
      channel.subscribeStaffAlerts(listener);
      fake.state.onSubscribe?.('SUBSCRIBED');
      expect(channel.getStaffAlertStatus()).toBe('connected');
      listener.mockClear(); // lượt hỏi bù ngay sau khi nối
      vi.advanceTimersByTime(6_000); // qua cửa sổ gộp để chắc listener không bị gọi vì lý do khác

      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);
      expect(channel.getStaffAlertStatus()).toBe('live');
      vi.advanceTimersByTime(6_000);
      expect(listener).not.toHaveBeenCalled();
    });

    it('drops back to connected when no heartbeat arrives within the stale window', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn());
      fake.state.onSubscribe?.('SUBSCRIBED');
      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);

      vi.advanceTimersByTime(channel.STAFF_ALERT_HEARTBEAT_STALE_MS - 1);
      expect(channel.getStaffAlertStatus()).toBe('live');
      vi.advanceTimersByTime(1);
      expect(channel.getStaffAlertStatus()).toBe('connected');
    });

    it('re-arms the stale timer on each heartbeat', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn());
      fake.state.onSubscribe?.('SUBSCRIBED');
      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);

      vi.advanceTimersByTime(5 * 60_000);
      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);
      vi.advanceTimersByTime(channel.STAFF_ALERT_HEARTBEAT_STALE_MS - 1);
      expect(channel.getStaffAlertStatus()).toBe('live');
      vi.advanceTimersByTime(1);
      expect(channel.getStaffAlertStatus()).toBe('connected');
    });

    it('leaves live on CHANNEL_ERROR and the old stale timer does not resurrect connected', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn());
      fake.state.onSubscribe?.('SUBSCRIBED');
      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);

      fake.state.onSubscribe?.('CHANNEL_ERROR');
      expect(channel.getStaffAlertStatus()).toBe('disconnected');
      vi.advanceTimersByTime(channel.STAFF_ALERT_HEARTBEAT_STALE_MS);
      expect(channel.getStaffAlertStatus()).toBe('disconnected');
    });

    it('ignores a heartbeat that arrives before SUBSCRIBED', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn());

      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);
      expect(channel.getStaffAlertStatus()).toBe('connecting');
      fake.state.onSubscribe?.('SUBSCRIBED');
      expect(channel.getStaffAlertStatus()).toBe('connected');
    });

    it('re-subscribing resets live to connected until the next heartbeat', async () => {
      const channel = await load();
      channel.subscribeStaffAlerts(vi.fn());
      fake.state.onSubscribe?.('SUBSCRIBED');
      emit(channel.STAFF_ALERT_HEARTBEAT_EVENT);

      fake.state.onSubscribe?.('SUBSCRIBED');
      expect(channel.getStaffAlertStatus()).toBe('connected');
    });
  });
});
