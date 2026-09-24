import { App, Button, Card, Descriptions, Modal, Tabs } from 'antd';
import {
  DesktopOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  DEFAULT_TABLE_DENSITY,
  setTableDensity,
  useTableDensity,
  type TableDensity,
} from '@/foundation/table';
import { API_URL } from '@/lib/api/fetcher';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Chỉ giữ thiết lập có component thật sự đọc để áp dụng (mật độ bảng → AdminTable). Page size,
 * âm thanh, cảnh báo tồn và tự đóng tab đã bị gỡ vì chưa có tính năng nào đứng sau chúng.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { message } = App.useApp();
  const tableDensity = useTableDensity();

  const updateDensity = (density: TableDensity) => {
    setTableDensity(density);
    void message.success('Đã lưu thiết lập');
  };

  const handleReset = () => {
    setTableDensity(DEFAULT_TABLE_DENSITY);
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
              Tùy chỉnh hiển thị bảng dữ liệu trên trình duyệt này
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
                        {tableDensity === 'compact'
                          ? 'Tinh gọn'
                          : tableDensity === 'comfortable'
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
                        const isSelected = tableDensity === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => updateDensity(opt.value)}
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
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Môi trường</span>}>
                        <span className="font-mono text-xs text-slate-700">{import.meta.env.MODE}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label={<span className="text-slate-500 text-xs">Backend API</span>}>
                        {/* Đọc từ cấu hình build thay vì hard-code, để bản Preview/dev không hiển thị URL production. */}
                        <span className="font-mono text-xs text-slate-700">{API_URL}</span>
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
