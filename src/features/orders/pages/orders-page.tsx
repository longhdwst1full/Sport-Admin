import { useEffect, useState } from 'react';
import { DollarOutlined, InboxOutlined, ReloadOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Tabs } from 'antd';
import { useDebounce } from 'use-debounce';
import { useListAdminOrders } from '@/generated/api/orders/orders';
import type { ListAdminOrdersStatusGroup } from '@/generated/api/orders/models';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import { OrderDetailDrawer } from '../components/order-detail-drawer';
import { OrderTable } from '../components/order-table';
import { moneyFormatter, ORDER_PAGE_SIZE, orderTabs } from '../constants/order.constants';

type OrderTab = 'ALL' | ListAdminOrdersStatusGroup;

export function OrdersPage() {
  const [tab, setTab] = useState<OrderTab>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  useEffect(() => setPage(1), [tab, debouncedSearch]);

  const orders = useListAdminOrders({
    page,
    limit: ORDER_PAGE_SIZE,
    statusGroup: tab === 'ALL' ? undefined : tab,
    search: debouncedSearch || undefined,
  });
  const rows = orders.data?.items ?? [];

  return (
    <>
      <ManagementPage
        eyebrow="Sales operations"
        title="Đơn hàng"
        description="Theo dõi đơn từ lúc chờ xác nhận đến khi giao thành công theo đúng phạm vi chi nhánh."
        dataNotice="Danh sách và tìm kiếm chạy server-side trên dữ liệu Order thật; trạng thái thanh toán và giao hàng là snapshot từ Backend."
        metrics={[
          { key: 'total', label: 'Đơn phù hợp', value: orders.data?.total ?? 0, icon: <ShoppingCartOutlined />, tone: 'blue' },
          { key: 'page', label: 'Đơn trên trang', value: rows.length, icon: <InboxOutlined /> },
          { key: 'items', label: 'Sản phẩm trên trang', value: rows.reduce((sum, order) => sum + order.itemCount, 0), icon: <ShoppingCartOutlined />, tone: 'orange' },
          { key: 'value', label: 'Giá trị trên trang', value: moneyFormatter.format(rows.reduce((sum, order) => sum + Number(order.grandTotal), 0)), icon: <DollarOutlined />, tone: 'green', hint: 'Giá đã gồm VAT' },
        ]}
        filters={(
          <div className="flex w-full flex-wrap items-center gap-3">
            <Input.Search
              allowClear
              className="min-w-72 max-w-lg flex-1"
              value={search}
              placeholder="Mã đơn, tên, SĐT hoặc email người nhận"
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void orders.refetch()}>Làm mới</Button>
          </div>
        )}
      >
        <Tabs
          activeKey={tab}
          items={orderTabs.map((item) => ({ key: item.key, label: item.label }))}
          onChange={(key) => setTab(key as OrderTab)}
        />
        {orders.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách đơn hàng"
            description={getApiErrorMessage(orders.error, 'Vui lòng kiểm tra phiên đăng nhập và phạm vi chi nhánh.')}
            action={<Button onClick={() => void orders.refetch()}>Thử lại</Button>}
          />
        )}
        <OrderTable
          rows={rows}
          loading={orders.isLoading || orders.isFetching}
          page={page}
          total={orders.data?.total ?? 0}
          onPageChange={setPage}
          onOpen={setSelectedId}
        />
      </ManagementPage>
      <OrderDetailDrawer orderId={selectedId} onClose={() => setSelectedId(undefined)} />
    </>
  );
}

