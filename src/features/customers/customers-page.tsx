import { useMemo, useState } from 'react';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TagOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import { SensitiveTextToggle } from '@/foundation/typography/sensitive-text-toggle';
import { exportTableToCsv } from '@/foundation/export/export-table';
import { ColumnSettingsModal, type ColumnItem } from '@/foundation/table/column-settings-modal';
import { PageTransition } from '@/foundation/layout/page-transition';
import {
  CUSTOMER_FIXTURES,
  type CustomerFixture,
  type CustomerStatus,
  type CustomerType,
} from './customers.fixture';

const customerStatuses: Record<CustomerStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: 'Đang hoạt động' },
  NEEDS_VERIFICATION: { color: 'gold', label: 'Cần xác minh' },
  BLOCKED: { color: 'red', label: 'Đã khóa' },
};

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const TABLE_COLUMNS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'contact', label: 'Liên hệ' },
  { id: 'type', label: 'Loại hồ sơ' },
  { id: 'verified', label: 'Xác minh' },
  { id: 'orders', label: 'Số đơn hàng' },
  { id: 'lifetimeValue', label: 'Tổng chi tiêu' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'action', label: 'Thao tác', fixed: true },
];

export function CustomersPage() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<CustomerType | undefined>();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerFixture | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>({
    customer: true,
    contact: true,
    type: true,
    verified: true,
    orders: true,
    lifetimeValue: true,
    status: true,
    action: true,
  });

  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return CUSTOMER_FIXTURES.filter(
      (customer) =>
        (!type || customer.type === type) &&
        (!keyword ||
          [customer.id, customer.name, customer.phone, customer.email ?? ''].some((value) =>
            value.toLocaleLowerCase('vi').includes(keyword),
          )),
    );
  }, [search, type]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Đã sao chép ${label}: ${text}`);
  };

  const columns = [
    ...(colVisibility.customer !== false
      ? [
          {
            title: 'Khách hàng',
            key: 'customer',
            fixed: 'left' as const,
            width: 280,
            render: (_: unknown, row: CustomerFixture) => {
              const gradient = getAvatarGradient(row.name);
              const initial = row.name.slice(0, 1).toUpperCase();
              return (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white font-semibold text-sm shadow-sm`}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <Typography.Text strong className="block truncate text-slate-800 hover:text-emerald-600 transition-colors">
                      {row.name}
                    </Typography.Text>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="font-mono">{row.id}</span>
                      <Tooltip title="Sao chép mã">
                        <button
                          type="button"
                          aria-label="Sao chép mã"
                          onClick={() => copyToClipboard(row.id, 'mã khách hàng')}
                          className="hover:text-emerald-600 cursor-pointer"
                        >
                          <CopyOutlined className="text-[10px]" />
                        </button>
                      </Tooltip>
                      {row.tags.slice(0, 1).map((t) => (
                        <span key={t} className="rounded bg-slate-100 px-1 py-0.2 text-[10px] text-slate-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            },
          },
        ]
      : []),
    ...(colVisibility.contact !== false
      ? [
          {
            title: 'Liên hệ',
            key: 'contact',
            width: 250,
            render: (_: unknown, row: CustomerFixture) => (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <PhoneOutlined className="text-slate-400" />
                  <SensitiveTextToggle text={row.phone} />
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MailOutlined className="text-slate-400" />
                  {row.email ? (
                    <SensitiveTextToggle text={row.email} />
                  ) : (
                    <span className="text-slate-400">Chưa đăng ký email</span>
                  )}
                </div>
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.type !== false
      ? [
          {
            title: 'Loại hồ sơ',
            dataIndex: 'type',
            width: 140,
            render: (value: CustomerType) =>
              value === 'MEMBER' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                  <IdcardOutlined />
                  Thành viên
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                  <ShoppingOutlined />
                  Guest
                </span>
              ),
          },
        ]
      : []),
    ...(colVisibility.verified !== false
      ? [
          {
            title: 'Xác thực',
            dataIndex: 'verifiedBy',
            width: 130,
            render: (value: CustomerFixture['verifiedBy']) => {
              if (value === 'NONE') {
                return <span className="text-xs text-slate-400">Chưa xác thực</span>;
              }
              return (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                  <CheckCircleOutlined className="text-emerald-500" />
                  {value === 'BOTH' ? 'OTP & Email' : value}
                </span>
              );
            },
          },
        ]
      : []),
    ...(colVisibility.orders !== false
      ? [
          {
            title: 'Đơn hàng',
            dataIndex: 'orderCount',
            align: 'center' as const,
            width: 110,
            render: (value: number) => (
              <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {value} đơn
              </span>
            ),
          },
        ]
      : []),
    ...(colVisibility.lifetimeValue !== false
      ? [
          {
            title: 'Tổng chi tiêu',
            dataIndex: 'lifetimeValue',
            align: 'right' as const,
            width: 160,
            render: (value: number) => (
              <div className="font-semibold text-slate-800">
                <CurrencyAmount amount={value} />
              </div>
            ),
          },
        ]
      : []),
    ...(colVisibility.status !== false
      ? [
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 150,
            render: (value: CustomerStatus) => (
              <StatusTag status={value} presentations={customerStatuses} />
            ),
          },
        ]
      : []),
    ...(colVisibility.action !== false
      ? [
          {
            title: '',
            key: 'action',
            fixed: 'right' as const,
            width: 60,
            render: (_: unknown, row: CustomerFixture) => (
              <Tooltip title="Xem chi tiết">
                <Button
                  type="text"
                  aria-label={`Xem ${row.name}`}
                  icon={<EyeOutlined className="text-slate-500 hover:text-emerald-600" />}
                  onClick={() => setSelectedCustomer(row)}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Khách hàng & Hội viên"
        title="Quản lý khách hàng"
        description="Hồ sơ 360° thống nhất tài khoản thành viên, lịch sử đặt hàng, trạng thái xác thực và phân khúc khách hàng."
        dataNotice="Dữ liệu hiển thị từ Customer Master; khi tích hợp hoàn tất với Identity API, danh sách sẽ đồng bộ real-time."
        metrics={[
          {
            key: 'all',
            label: 'Tổng khách hàng',
            value: CUSTOMER_FIXTURES.length,
            icon: <TeamOutlined />,
            tone: 'green',
          },
          {
            key: 'members',
            label: 'Hội viên chính thức',
            value: CUSTOMER_FIXTURES.filter((item) => item.type === 'MEMBER').length,
            icon: <IdcardOutlined />,
            tone: 'blue',
          },
          {
            key: 'guests',
            label: 'Guest checkout',
            value: CUSTOMER_FIXTURES.filter((item) => item.type === 'GUEST').length,
            icon: <ShoppingOutlined />,
            tone: 'orange',
          },
          {
            key: 'verified',
            label: 'Đã xác minh KYC',
            value: CUSTOMER_FIXTURES.filter((item) => item.verifiedBy !== 'NONE').length,
            icon: <SafetyCertificateOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input.Search
                allowClear
                className="w-72"
                placeholder="Tên, mã, SĐT, email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Select
                allowClear
                className="w-44"
                placeholder="Loại khách hàng"
                value={type}
                options={[
                  { value: 'MEMBER', label: 'Thành viên' },
                  { value: 'GUEST', label: 'Guest checkout' },
                ]}
                onChange={setType}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                icon={<DownloadOutlined />}
                onClick={() =>
                  exportTableToCsv({
                    filename: `khach-hang-${new Date().toISOString().slice(0, 10)}`,
                    columns: [
                      { key: 'id', label: 'Mã KH' },
                      { key: 'name', label: 'Họ tên' },
                      { key: 'phone', label: 'Số điện thoại' },
                      { key: 'email', label: 'Email' },
                      { key: 'type', label: 'Loại hồ sơ', format: (val) => (val === 'MEMBER' ? 'Thành viên' : 'Guest') },
                      { key: 'verifiedBy', label: 'Xác minh' },
                      { key: 'orderCount', label: 'Số đơn' },
                      { key: 'lifetimeValue', label: 'Tổng chi tiêu (VNĐ)' },
                      { key: 'lastOrderAt', label: 'Lần mua cuối' },
                    ],
                    data: rows,
                  })
                }
                className="text-slate-600"
              >
                Xuất CSV
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setColumnModalOpen(true)}
                className="text-slate-600"
              >
                Tùy chỉnh cột
              </Button>
            </div>
          </div>
        }
      >
        <Table
          rowKey="id"
          dataSource={rows}
          scroll={{ x: 1080 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `Tổng cộng ${total} khách hàng`,
          }}
          columns={columns}
        />
      </ManagementPage>

      {/* Column settings modal */}
      <ColumnSettingsModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        columns={TABLE_COLUMNS}
        visibility={colVisibility}
        onChange={setColVisibility}
        onReset={() =>
          setColVisibility({
            customer: true,
            contact: true,
            type: true,
            verified: true,
            orders: true,
            lifetimeValue: true,
            status: true,
            action: true,
          })
        }
      />

      {/* Customer 360 Detail Drawer */}
      <Drawer
        width={640}
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={null}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        {selectedCustomer && (
          <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header profile banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-6 pt-8 pb-6 text-white">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="relative flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                    selectedCustomer.name,
                  )} text-white text-2xl font-bold shadow-lg ring-4 ring-white/10`}
                >
                  {selectedCustomer.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight truncate m-0">
                      {selectedCustomer.name}
                    </h2>
                    <Tag color={selectedCustomer.type === 'MEMBER' ? 'blue' : 'default'} className="m-0 font-medium">
                      {selectedCustomer.type === 'MEMBER' ? 'Thành viên' : 'Guest'}
                    </Tag>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                      {selectedCustomer.id}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-300">
                      {customerStatuses[selectedCustomer.status].label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedCustomer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-white/10 backdrop-blur-sm px-2 py-0.5 text-xs text-white/80 border border-white/10"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Quick Cards inside Drawer */}
              <div className="mt-6 grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
                  <div className="text-[11px] text-emerald-200/80">Tổng chi tiêu</div>
                  <div className="mt-0.5 text-sm font-bold text-white">
                    <CurrencyAmount amount={selectedCustomer.lifetimeValue} compact />
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
                  <div className="text-[11px] text-emerald-200/80">Tổng đơn hàng</div>
                  <div className="mt-0.5 text-sm font-bold text-white">
                    {selectedCustomer.orderCount} đơn
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
                  <div className="text-[11px] text-emerald-200/80">Lần mua gần nhất</div>
                  <div className="mt-0.5 text-xs font-semibold text-white truncate">
                    {selectedCustomer.lastOrderAt}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 p-6">
              <Tabs
                defaultActiveKey="info"
                items={[
                  {
                    key: 'info',
                    label: 'Hồ sơ chi tiết',
                    children: (
                      <div className="space-y-4">
                        <Card size="small" className="rounded-xl border-slate-200 shadow-sm">
                          <Descriptions column={1} size="small" className="dctd-descriptions">
                            <Descriptions.Item label="Số điện thoại">
                              <span className="font-mono font-medium text-slate-800">
                                {selectedCustomer.phone}
                              </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Hòm thư (Email)">
                              <span className="text-slate-700">
                                {selectedCustomer.email ?? 'Chưa đăng ký'}
                              </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Kiểu hồ sơ">
                              {selectedCustomer.type === 'MEMBER'
                                ? 'Hội viên đã có tài khoản hệ thống'
                                : 'Guest checkout (Lưu thông tin khi mua hàng)'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Xác thực danh tính">
                              {selectedCustomer.verifiedBy === 'NONE'
                                ? 'Chưa xác thực OTP/Email'
                                : `Đã xác thực qua ${selectedCustomer.verifiedBy}`}
                            </Descriptions.Item>
                          </Descriptions>
                        </Card>

                        <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                            Ghi chú chăm sóc khách hàng
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed m-0">
                            Khách hàng thân thiết, ưu tiên các chính sách bảo hành chính hãng và quà tặng phụ kiện kèm theo đơn.
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'orders',
                    label: `Lịch sử đơn hàng (${selectedCustomer.orderCount})`,
                    children: (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-emerald-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              ORD-2026-9182
                            </span>
                            <Tag color="green" className="m-0 text-[11px]">Giao thành công</Tag>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                            <span>{selectedCustomer.lastOrderAt} • 2 sản phẩm</span>
                            <span className="font-semibold text-slate-800">
                              <CurrencyAmount amount={selectedCustomer.lifetimeValue / (selectedCustomer.orderCount || 1)} />
                            </span>
                          </div>
                        </div>

                        {selectedCustomer.orderCount > 1 && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm opacity-80">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                ORD-2026-8043
                              </span>
                              <Tag color="blue" className="m-0 text-[11px]">Đã hoàn thành</Tag>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                              <span>15/07/2026 • 1 sản phẩm</span>
                              <span className="font-semibold text-slate-800">
                                <CurrencyAmount amount={850000} />
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* Footer Action Bar */}
            <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-between">
              <Button
                danger
                type="text"
                onClick={() => message.warning('Chức năng khóa hồ sơ đang chờ phân quyền cấp cao')}
              >
                Khóa tài khoản
              </Button>
              <Space>
                <Button onClick={() => setSelectedCustomer(null)}>Đóng</Button>
                <Button
                  type="primary"
                  onClick={() => message.info('Đã gửi SMS chăm sóc khách hàng')}
                >
                  Gửi thông báo / SMS
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}
