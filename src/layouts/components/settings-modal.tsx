import { useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Modal,
  Select,
  Switch,
  Tabs,
} from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { createBrowserStore, LocalStorageKey } from '@/core/storage';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface UserPreferences {
  tableDensity: 'compact' | 'middle' | 'comfortable';
  defaultPageSize: number;
  soundAlerts: boolean;
  stockAlerts: boolean;
  autoCloseTabs: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  tableDensity: 'middle',
  defaultPageSize: 20,
  soundAlerts: true,
  stockAlerts: true,
  autoCloseTabs: false,
};

const STORAGE_KEY = LocalStorageKey.PREFERENCES;

const preferencesStore = createBrowserStore<UserPreferences>(STORAGE_KEY);

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { message } = App.useApp();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    return preferencesStore.read() ?? DEFAULT_PREFERENCES;
  });

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    preferencesStore.write(updated);
    void message.success('Đã lưu thiết lập');
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
    preferencesStore.clear();
    void message.info('Đã khôi phục cài đặt gốc');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
      centered
      className="!p-0"
      styles={{
        content: { padding: 0, overflow: 'hidden', borderRadius: 20 },
      }}
    >
      {/* ── Modal Header ─────────────────────────────────────── */}
      <div className="border-b border-slate-100 bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <SettingOutlined className="text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">Cài đặt hệ thống</h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Tùy chỉnh giao diện, hiển thị dữ liệu và tùy chọn thông báo
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs Content ─────────────────────────────────────── */}
      <div className="p-6 bg-slate-50/50">
        <Tabs
          defaultActiveKey="display"
          items={[
            {
              key: 'display',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <DesktopOutlined />
                  Giao diện & Hiển thị
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {/* Table display density */}
                  <Card size="small" className="!rounded-2xl !border-slate-200 !shadow-xs p-1">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Mật độ dòng bảng dữ liệu
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Tùy chỉnh khoảng cách và độ cao dòng của bảng danh sách
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/80 rounded-full px-2.5 py-0.5">
                        {preferences.tableDensity === 'compact'
                          ? 'Tinh gọn'
                          : preferences.tableDensity === 'comfortable'
                          ? 'Rộng rãi'
                          : 'Tiêu chuẩn'}
                      </span>
                    </div>

                    <div role="radiogroup" aria-label="Mật độ dòng bảng dữ liệu" className="grid grid-cols-3 gap-3">
                      {[
                        {
                          value: 'compact' as const,
                          label: 'Tinh gọn',
                          desc: 'Hiển thị nhiều dữ liệu',
                          lines: 4,
                        },
                        {
                          value: 'middle' as const,
                          label: 'Tiêu chuẩn',
                          desc: 'Cân đối, tối ưu đọc',
                          lines: 3,
                        },
                        {
                          value: 'comfortable' as const,
                          label: 'Rộng rãi',
                          desc: 'Thoáng đãng, dễ nhìn',
                          lines: 2,
                        },
                      ].map((opt) => {
                        const isSelected = preferences.tableDensity === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => updatePreference('tableDensity', opt.value)}
                            className={`group relative flex flex-col items-center justify-center rounded-xl py-3.5 px-3 border text-center transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50/90 border-amber-500 text-amber-950 shadow-xs ring-2 ring-amber-500/25 scale-[1.01]'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 hover:-translate-y-0.5 hover:shadow-xs'
                            }`}
                          >
                            {/* Active check indicator */}
                            {isSelected && (
                              <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                                ✓
                              </span>
                            )}

                            {/* Visual row preview lines */}
                            <div className="mb-2.5 flex w-12 flex-col justify-center gap-1.5 h-6">
                              {opt.lines === 4 && (
                                <>
                                  <div className="h-1 w-full rounded-full bg-slate-400/80 transition-colors group-hover:bg-amber-600/70" />
                                  <div className="h-1 w-4/5 rounded-full bg-slate-300/80 transition-colors group-hover:bg-amber-500/60" />
                                  <div className="h-1 w-full rounded-full bg-slate-400/80 transition-colors group-hover:bg-amber-600/70" />
                                  <div className="h-1 w-3/4 rounded-full bg-slate-300/80 transition-colors group-hover:bg-amber-500/60" />
                                </>
                              )}
                              {opt.lines === 3 && (
                                <>
                                  <div className="h-1.5 w-full rounded-full bg-slate-400/80 transition-colors group-hover:bg-amber-600/70" />
                                  <div className="h-1.5 w-4/5 rounded-full bg-slate-300/80 transition-colors group-hover:bg-amber-500/60" />
                                  <div className="h-1.5 w-full rounded-full bg-slate-400/80 transition-colors group-hover:bg-amber-600/70" />
                                </>
                              )}
                              {opt.lines === 2 && (
                                <>
                                  <div className="h-2 w-full rounded-full bg-slate-400/80 transition-colors group-hover:bg-amber-600/70" />
                                  <div className="h-2 w-4/5 rounded-full bg-slate-300/80 transition-colors group-hover:bg-amber-500/60" />
                                </>
                              )}
                            </div>

                            <span
                              className={`text-sm font-semibold tracking-tight transition-colors ${
                                isSelected ? 'text-amber-950 font-bold' : 'text-slate-800'
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span
                              className={`text-[11px] mt-0.5 transition-colors ${
                                isSelected ? 'text-amber-700/90 font-medium' : 'text-slate-400'
                              }`}
                            >
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Default page size */}
                  <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Số bản ghi hiển thị mỗi trang
                        </div>
                        <div className="text-xs text-slate-500">
                          Áp dụng mặc định cho tất cả bảng danh sách (Đơn hàng, Khách hàng, SP...)
                        </div>
                      </div>
                      <Select
                        value={preferences.defaultPageSize}
                        onChange={(val) => updatePreference('defaultPageSize', val)}
                        options={[
                          { value: 10, label: '10 dòng / trang' },
                          { value: 20, label: '20 dòng / trang' },
                          { value: 50, label: '50 dòng / trang' },
                          { value: 100, label: '100 dòng / trang' },
                        ]}
                        className="w-36"
                      />
                    </div>
                  </Card>
                </div>
              ),
            },
            {
              key: 'notifications',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <BellOutlined />
                  Thông báo & Cảnh báo
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs divide-y divide-slate-100">
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-start gap-3">
                        <SoundOutlined className="text-emerald-600 text-lg mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            Âm thanh thông báo đơn hàng mới
                          </div>
                          <div className="text-xs text-slate-500">
                            Phát chuông thông báo khi có đơn đặt hàng trực tuyến mới từ khách hàng
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.soundAlerts}
                        onChange={(val) => updatePreference('soundAlerts', val)}
                        className="bg-slate-300"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-start gap-3">
                        <BellOutlined className="text-amber-500 text-lg mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            Cảnh báo tồn kho dưới mức an toàn
                          </div>
                          <div className="text-xs text-slate-500">
                            Hiển thị nhãn cảnh báo khi sản phẩm trong kho có số lượng khả dụng &lt; 10
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.stockAlerts}
                        onChange={(val) => updatePreference('stockAlerts', val)}
                        className="bg-slate-300"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-start gap-3">
                        <AppstoreOutlined className="text-blue-500 text-lg mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            Tự động dọn dẹp các tab không hoạt động
                          </div>
                          <div className="text-xs text-slate-500">
                            Giới hạn thanh điều hướng tối đa 8 tab đang mở để tăng hiệu năng
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={preferences.autoCloseTabs}
                        onChange={(val) => updatePreference('autoCloseTabs', val)}
                        className="bg-slate-300"
                      />
                    </div>
                  </Card>
                </div>
              ),
            },
            {
              key: 'system',
              label: (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <InfoCircleOutlined />
                  Thông tin hệ thống
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Hạ tầng & Kết nối
                    </div>
                    <Descriptions column={1} size="small" className="dctd-profile-descriptions">
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Ứng dụng</span>}>
                        <span className="font-semibold text-slate-900">Bảo An Sport Admin Portal</span>
                      </Descriptions.Item>
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Phiên bản</span>}>
                        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          v1.0.0 (Production Candidate)
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Backend API</span>}>
                        <div className="flex items-center gap-2">
                          <Badge status="success" />
                          <span className="font-mono text-xs text-slate-700">https://sport-api-doc.vercel.app/api/v1</span>
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Cơ sở dữ liệu</span>}>
                        <div className="flex items-center gap-2">
                          <DatabaseOutlined className="text-emerald-600" />
                          <span className="text-xs text-slate-800 font-medium">
                            PostgreSQL 16 (sport_db · 30 migrations active)
                          </span>
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Cơ chế xác thực</span>}>
                        <span className="text-xs text-slate-700">JWT TokenPair · Access (15m) / Refresh (30d)</span>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Modal Footer ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3.5">
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          onClick={handleReset}
          className="!text-slate-400 hover:!text-slate-700"
        >
          Khôi phục mặc định
        </Button>
        <Button type="primary" onClick={onClose} className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-500 !px-5 font-semibold">
          Hoàn tất
        </Button>
      </div>
    </Modal>
  );
}
