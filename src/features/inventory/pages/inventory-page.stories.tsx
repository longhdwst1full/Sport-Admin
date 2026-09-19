import { AuditOutlined, InboxOutlined, PlusOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, Button, Empty, Input, Progress, Select, Tabs, Tag, Typography } from 'antd';
import { ManagementPage } from '@/foundation/management';
import { AdminTable } from '@/foundation/table';

const balances = [
  { id: '1', sku: 'TA-CAO-SU-5KG', productName: 'Tạ tay cao su 5kg', warehouseCode: 'KHO-HCM-01', onHand: 12, reserved: 2, available: 10, reorderPoint: 3, status: 'IN_STOCK' },
  { id: '2', sku: 'THAM-YOGA-PRO', productName: 'Thảm yoga Pro', warehouseCode: 'KHO-HCM-01', onHand: 4, reserved: 1, available: 3, reorderPoint: 5, status: 'LOW_STOCK' },
  { id: '3', sku: 'DAY-KHANG-LUC', productName: 'Dây kháng lực', warehouseCode: 'KHO-HCM-01', onHand: 0, reserved: 0, available: 0, reorderPoint: 4, status: 'OUT_OF_STOCK' },
];

const transfers = [
  { id: '10', transferNo: 'TRF-2026-HCM-HN-001', from: 'KHO-HCM-01', to: 'KHO-HN-01', status: 'SHIPPED', itemCount: 3 },
  { id: '11', transferNo: 'TRF-2026-HN-DN-002', from: 'KHO-HN-01', to: 'KHO-DN-01', status: 'DRAFT', itemCount: 2 },
];

const status = {
  IN_STOCK: { color: 'green', label: 'Còn hàng' },
  LOW_STOCK: { color: 'orange', label: 'Sắp hết' },
  OUT_OF_STOCK: { color: 'red', label: 'Hết hàng' },
} as const;

function InventoryReview({ state }: { state: 'loaded' | 'empty' | 'error' }) {
  return (
    <ManagementPage
      eyebrow="Inventory control"
      title="Tồn kho & sổ kho"
      description="Theo dõi tồn khả dụng theo kho, phiếu điều chỉnh và ledger bất biến."
      actions={<Button type="primary" icon={<PlusOutlined />}>Tạo phiếu điều chỉnh</Button>}
      metrics={[
        { key: 'sku', label: 'Dòng tồn', value: state === 'loaded' ? 3 : 0, icon: <InboxOutlined /> },
        { key: 'available', label: 'Có thể bán trên trang', value: state === 'loaded' ? 13 : 0, icon: <SwapOutlined />, tone: 'green' },
        { key: 'low', label: 'Sắp hết trên trang', value: state === 'loaded' ? 1 : 0, icon: <WarningOutlined />, tone: 'orange' },
        { key: 'out', label: 'Hết hàng trên trang', value: state === 'loaded' ? 1 : 0, icon: <AuditOutlined />, tone: 'red' },
      ]}
    >
      <Tabs
        items={[{
          key: 'balances',
          label: 'Tồn theo kho',
          children: (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Input.Search className="max-w-sm" placeholder="Tìm SKU hoặc tên sản phẩm" />
                <Select className="min-w-60" placeholder="Tất cả kho" options={[{ value: 'KHO-HCM-01', label: 'KHO-HCM-01 — Kho Hồ Chí Minh' }]} />
              </div>
              {state === 'error' && (
                <Alert type="error" showIcon message="Không thể tải dữ liệu" description="Kết nối hoặc dịch vụ đang có lỗi. Vui lòng thử lại." action={<Button>Thử lại</Button>} />
              )}
              {state === 'empty' ? <Empty description="Chưa có tồn kho phù hợp bộ lọc." /> : (
                <AdminTable
                  rowKey="id"
                  dataSource={state === 'loaded' ? balances : []}
                  pagination={false}
                  scroll={{ x: 900 }}
                  columns={[
                    { title: 'Sản phẩm / SKU', dataIndex: 'sku', render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
                    { title: 'Kho', dataIndex: 'warehouseCode' },
                    { title: 'Tồn vật lý', dataIndex: 'onHand', align: 'right' },
                    { title: 'Đang giữ', dataIndex: 'reserved', align: 'right' },
                    { title: 'Có thể bán', dataIndex: 'available', align: 'right', render: (value, row) => <div><strong>{value}</strong><Progress percent={row.onHand ? Math.round((value / row.onHand) * 100) : 0} showInfo={false} size="small" /></div> },
                    { title: 'Trạng thái', dataIndex: 'status', render: (value: keyof typeof status) => <Tag color={status[value].color}>{status[value].label}</Tag> },
                    { title: 'Thao tác', render: () => <Button type="link">Điều chỉnh</Button> },
                  ]}
                />
              )}
            </div>
          ),
        }, { key: 'movements', label: 'Sổ kho', children: 'Ledger dùng cursor và bộ lọc kho/SKU/loại.' }, { key: 'adjustments', label: 'Phiếu điều chỉnh', children: 'Danh sách và chi tiết chứng từ điều chỉnh.' }, {
          key: 'transfers',
          label: 'Chuyển kho',
          children: <AdminTable rowKey="id" dataSource={state === 'loaded' ? transfers : []} pagination={false} columns={[
            { title: 'Số phiếu', dataIndex: 'transferNo', render: (value) => <Typography.Text code>{value}</Typography.Text> },
            { title: 'Kho xuất', dataIndex: 'from' },
            { title: 'Kho nhận', dataIndex: 'to' },
            { title: 'Số SKU', dataIndex: 'itemCount', align: 'right' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value) => <Tag color={value === 'SHIPPED' ? 'orange' : 'default'}>{value === 'SHIPPED' ? 'Đang vận chuyển' : 'Nháp'}</Tag> },
            { title: 'Thao tác', render: () => <Button type="link">Xem & xử lý</Button> },
          ]} />,
        }]}
      />
    </ManagementPage>
  );
}

const meta = {
  title: 'Features/Inventory/InventoryPage',
  component: InventoryReview,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="min-h-screen bg-slate-50 p-8"><Story /></div>],
} satisfies Meta<typeof InventoryReview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = { args: { state: 'loaded' } };
export const EmptyState: Story = { args: { state: 'empty' } };
export const RecoverableError: Story = { args: { state: 'error' } };
