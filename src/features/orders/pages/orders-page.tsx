import { lazy, Suspense, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { useCopilotPageHints } from '@/features/assistant-copilot';
import { PosOrderDrawer } from '@/features/pos';
import {
  DollarOutlined,
  InboxOutlined,
  PhoneOutlined,
  PlusOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Tabs } from 'antd';
import { useListAdminOrders } from '@/generated/api/orders/orders';
import { OrderStatusGroup } from '@/generated/api/orders/orders.schemas';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  ColumnSettingsModal,
  FilterBar,
  RefreshButton,
  useColumnVisibility,
} from '@/foundation/table';
import { PageTransition } from '@/foundation/layout/page-transition';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { OrderDetailDrawer } from '../components/order-detail-drawer';
import { OrderTable } from '../components/order-table';
import { moneyFormatter, ORDER_COLUMN_ITEMS, orderTabs } from '../constants/order.constants';

// Nạp lười để phá vòng chunk tĩnh orders ↔ fulfillments (FulfillmentsPage lại import OrderDetailDrawer
// từ barrel orders); vẫn đi qua barrel theo RULE-FA-03.
const FulfillmentWorkflowPanel = lazy(() =>
  import('@/features/fulfillments').then((module) => ({ default: module.FulfillmentWorkflowPanel })),
);
const FulfillmentStatusTag = lazy(() =>
  import('@/features/fulfillments').then((module) => ({ default: module.FulfillmentStatusTag })),
);

type OrderTab = 'ALL' | OrderStatusGroup;

/**
 * Tab nhóm trạng thái, ô tìm kiếm và trang nằm trên URL (`status`, `orderNo`, `name`, `phone`, `page`)
 * để F5/Back/gửi link giữ nguyên. Ô tìm kiếm giữ chữ đang gõ ở state cục bộ và ghi giá trị đã debounce
 * lên URL; query đọc URL. Đổi bộ lọc thì xoá `page`. Kích thước trang chỉ sống trong màn.
 */
export function OrdersPage() {
  // Mỗi ô là một điều kiện riêng, cộng dồn bằng AND ở backend: nhập cả mã đơn lẫn
  // số điện thoại sẽ thu hẹp kết quả chứ không mở rộng như ô gộp trước đây.
  const search = useUrlSearch(['orderNo', 'name', 'phone']);
  const { url } = search;
  const tab: OrderTab = url.getEnum('status', OrderStatusGroup) ?? 'ALL';
  const page = url.getNumber('page', 1);
  const [createOpen, setCreateOpen] = useState(false);
  const [pageSize, setPageSize] = useState(ADMIN_TABLE_DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string>();
  // Đơn đang mở ở drawer chi tiết là ngữ cảnh gợi ý cho Copilot.
  useCopilotPageHints(selectedId ? { orderId: selectedId } : undefined);
  const columnsState = useColumnVisibility(ORDER_COLUMN_ITEMS);

  const orders = useListAdminOrders({
    page,
    limit: pageSize,
    statusGroup: tab === 'ALL' ? undefined : tab,
    orderNo: url.get('orderNo'),
    recipientName: url.get('name'),
    recipientPhone: url.get('phone'),
  });
  const rows = orders.data?.items ?? [];

  const totalValue = rows.reduce((sum, order) => sum + Number(order.grandTotal), 0);

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Vận hành bán hàng"
        title="Quản lý đơn hàng"
        description="Theo dõi toàn bộ đơn hàng từ lúc đặt, xác nhận, đóng gói, xuất kho đến giao hàng thành công."
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
          <FilterBar
            actions={
              <>
                <RefreshButton onRefresh={orders.refetch} loading={orders.isFetching} />
                <Button
                  icon={<SettingOutlined />}
                  onClick={columnsState.open}
                  className="text-slate-600"
                >
                  Tuỳ chỉnh cột
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
              </>
            }
          >
            <SearchInput
              value={search.values.orderNo}
              placeholder="Nhập mã đơn hàng..."
              onChange={search.setter('orderNo')}
            />
            <SearchInput
              icon={<UserOutlined className="text-slate-400" />}
              value={search.values.name}
              placeholder="Nhập tên người nhận..."
              onChange={search.setter('name')}
            />
            <SearchInput
              icon={<PhoneOutlined className="text-slate-400" />}
              value={search.values.phone}
              placeholder="Nhập số điện thoại..."
              onChange={search.setter('phone')}
            />
          </FilterBar>
        }
      >
        <Tabs
          activeKey={tab}
          items={orderTabs}
          onChange={(key) => url.patch({ status: key === 'ALL' ? undefined : key, page: undefined })}
          className="mb-3"
        />

        {orders.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách đơn hàng"
            error={orders.error}
            retry={() => void orders.refetch()}
          />
        )}

        <OrderTable
          rows={rows}
          loading={orders.isLoading || orders.isFetching}
          page={page}
          pageSize={pageSize}
          total={orders.data?.total ?? 0}
          colVisibility={columnsState.visibility}
          onPageChange={(nextPage, nextPageSize) => {
            url.set('page', nextPageSize === pageSize && nextPage > 1 ? nextPage : undefined);
            setPageSize(nextPageSize);
          }}
          onOpen={setSelectedId}
        />
      </ManagementPage>

      <ColumnSettingsModal {...columnsState.modalProps} columns={ORDER_COLUMN_ITEMS} />

      <OrderDetailDrawer
        orderId={selectedId}
        onClose={() => setSelectedId(undefined)}
        renderFulfillmentPanel={(orderId) => (
          <Suspense fallback={null}>
            <FulfillmentWorkflowPanel orderId={orderId} />
          </Suspense>
        )}
        renderShipmentStatus={(status) => (
          <Suspense fallback={null}>
            <FulfillmentStatusTag status={status} />
          </Suspense>
        )}
      />
      <PosOrderDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageTransition>
  );
}
