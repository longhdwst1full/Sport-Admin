import { useEffect, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { PosOrderDrawer } from '@/features/pos/components/pos-order-drawer';
import {
  DollarOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Alert, Button, Input, Tabs } from 'antd';
import { useDebounce } from 'use-debounce';
import { useListAdminOrders } from '@/generated/api/orders/orders';
import type { ListAdminOrdersStatusGroup } from '@/generated/api/orders/models';
import { ManagementPage } from '@/foundation/management';
import { ColumnSettingsModal, type ColumnItem } from '@/foundation/table/column-settings-modal';
import { PageTransition } from '@/foundation/layout/page-transition';
import { getApiErrorMessage } from '@/lib/api/error';
import { OrderDetailDrawer } from '../components/order-detail-drawer';
import { OrderTable } from '../components/order-table';
import { moneyFormatter, ORDER_PAGE_SIZE, orderTabs } from '../constants/order.constants';

type OrderTab = 'ALL' | ListAdminOrdersStatusGroup;

const ORDER_COLUMNS: ColumnItem[] = [
  { id: 'order', label: 'Mã đơn hàng', fixed: true },
  { id: 'recipient', label: 'Người nhận hàng' },
  { id: 'branch', label: 'Chi nhánh xuất' },
  { id: 'itemCount', label: 'Số lượng SP' },
  { id: 'grandTotal', label: 'Tổng tiền' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'status', label: 'Trạng thái đơn' },
  { id: 'actions', label: 'Thao tác', fixed: true },
];

export function OrdersPage() {
  const [tab, setTab] = useState<OrderTab>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>({
    order: true,
    recipient: true,
    branch: true,
    itemCount: true,
    grandTotal: true,
    payment: true,
    status: true,
    actions: true,
  });

  // Mỗi ô là một điều kiện riêng, cộng dồn bằng AND ở backend: nhập cả mã đơn lẫn
  // số điện thoại sẽ thu hẹp kết quả chứ không mở rộng như ô gộp trước đây.
  const [debouncedOrderNo] = useDebounce(orderNo.trim(), 350);
  const [debouncedName] = useDebounce(recipientName.trim(), 350);
  const [debouncedPhone] = useDebounce(recipientPhone.trim(), 350);
  useEffect(
    () => setPage(1),
    [tab, debouncedOrderNo, debouncedName, debouncedPhone],
  );

  const orders = useListAdminOrders({
    page,
    limit: ORDER_PAGE_SIZE,
    statusGroup: tab === 'ALL' ? undefined : tab,
    orderNo: debouncedOrderNo || undefined,
    recipientName: debouncedName || undefined,
    recipientPhone: debouncedPhone || undefined,
  });
  const rows = orders.data?.items ?? [];

  const totalValue = rows.reduce((sum, order) => sum + Number(order.grandTotal), 0);

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Vận hành bán hàng"
        title="Quản lý đơn hàng"
        description="Theo dõi toàn bộ đơn hàng từ lúc đặt, xác nhận, đóng gói, xuất kho đến giao hàng thành công."
        dataNotice="Danh sách và tìm kiếm chạy server-side trên dữ liệu Order thật; trạng thái thanh toán và giao hàng là snapshot từ Backend."
        metrics={[
          {
            key: 'total',
            label: 'Tổng đơn khớp lọc',
            value: orders.data?.total ?? 0,
            icon: <ShoppingCartOutlined />,
            tone: 'blue',
          },
          {
            key: 'page',
            label: 'Đơn trên trang',
            value: rows.length,
            icon: <InboxOutlined />,
            tone: 'green',
          },
          {
            key: 'items',
            label: 'Sản phẩm trên trang',
            value: rows.reduce((sum, order) => sum + order.itemCount, 0),
            icon: <ShoppingCartOutlined />,
            tone: 'orange',
          },
          {
            key: 'value',
            label: 'Doanh thu trên trang',
            value: moneyFormatter.format(totalValue),
            icon: <DollarOutlined />,
            tone: 'green',
            hint: 'Giá đã bao gồm VAT',
          },
        ]}
        filters={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <Input
                allowClear
                className="!w-48"
                value={orderNo}
                placeholder="Mã đơn"
                onChange={(event) => setOrderNo(event.target.value)}
              />
              <Input
                allowClear
                className="!w-52"
                value={recipientName}
                placeholder="Tên người nhận"
                onChange={(event) => setRecipientName(event.target.value)}
              />
              <Input
                allowClear
                className="!w-44"
                value={recipientPhone}
                placeholder="Số điện thoại"
                onChange={(event) => setRecipientPhone(event.target.value)}
              />
              <Button icon={<ReloadOutlined />} onClick={() => void orders.refetch()}>
                Làm mới
              </Button>
              <PermissionGate permission="order.manage">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateOpen(true)}
                >
                  Tạo đơn
                </Button>
              </PermissionGate>
            </div>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setColumnModalOpen(true)}
              className="text-slate-600"
            >
              Tùy chỉnh cột
            </Button>
          </div>
        }
      >
        <Tabs
          activeKey={tab}
          items={orderTabs.map((item) => ({ key: item.key, label: item.label }))}
          onChange={(key) => setTab(key as OrderTab)}
          className="mb-3"
        />

        {orders.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách đơn hàng"
            description={getApiErrorMessage(
              orders.error,
              'Vui lòng kiểm tra phiên đăng nhập và phạm vi chi nhánh.',
            )}
            action={<Button onClick={() => void orders.refetch()}>Thử lại</Button>}
          />
        )}

        <OrderTable
          rows={rows}
          loading={orders.isLoading || orders.isFetching}
          page={page}
          total={orders.data?.total ?? 0}
          colVisibility={colVisibility}
          onPageChange={setPage}
          onOpen={setSelectedId}
        />
      </ManagementPage>

      <ColumnSettingsModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        columns={ORDER_COLUMNS}
        visibility={colVisibility}
        onChange={setColVisibility}
        onReset={() =>
          setColVisibility({
            order: true,
            recipient: true,
            branch: true,
            itemCount: true,
            grandTotal: true,
            payment: true,
            status: true,
            actions: true,
          })
        }
      />

      <OrderDetailDrawer orderId={selectedId} onClose={() => setSelectedId(undefined)} />
      <PosOrderDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageTransition>
  );
}
