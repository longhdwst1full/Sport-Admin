import { useState } from 'react';
import {
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Modal,
  Radio,
  Select,
  Switch,
  Tabs,
  Tag,
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
                      {/* Display density & options */}
                      <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Hiển thị giao diện
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">Chế độ chuẩn JARVIS</div>
                            <div className="text-xs text-slate-500">Sidebar tối kết hợp khu vực làm việc sáng sắc nét</div>
                          </div>
                          <Tag color="gold" className="!mr-0 font-medium">Tiêu chuẩn</Tag>
                        </div>
                      </Card>

                  {/* Table display density */}
                  <Card size="small" className="!rounded-xl !border-slate-200 !shadow-xs">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Mật độ dòng bảng dữ liệu
                    </div>
                    <Radio.Group
                      value={preferences.tableDensity}
                      onChange={(e) => updatePreference('tableDensity', e.target.value)}
                      className="w-full grid grid-cols-3 gap-2"
                    >
                      <Radio.Button value="compact" className="!text-center !rounded-lg !text-xs">
                        Tinh gọn
                      </Radio.Button>
                      <Radio.Button value="middle" className="!text-center !rounded-lg !text-xs">
                        Tiêu chuẩn
                      </Radio.Button>
                      <Radio.Button value="comfortable" className="!text-center !rounded-lg !text-xs">
                        Rộng rãi
                      </Radio.Button>
                    </Radio.Group>
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
