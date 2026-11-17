import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { useCopilotPageHints } from '@/features/assistant-copilot';
import {
  ClockCircleOutlined,
  DollarOutlined,
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
import { useOrderLiveSummary } from '../hooks/use-order-live-summary';
import { ORDER_COLUMN_ITEMS, orderFilterOnlyTabs, orderTabs } from '../constants/order.constants';
import { toOrderRow } from '../model/order.mapper';

// Nạp lười để phá vòng chunk tĩnh orders ↔ fulfillments (FulfillmentsPage lại import OrderDetailDrawer
// từ barrel orders); vẫn đi qua barrel theo RULE-FA-03.
const FulfillmentWorkflowPanel = lazy(() =>
  import('@/features/fulfillments').then((module) => ({ default: module.FulfillmentWorkflowPanel })),
);
const FulfillmentStatusTag = lazy(() =>
  import('@/features/fulfillments').then((module) => ({ default: module.FulfillmentStatusTag })),
);

// Drawer POS nặng (cả module pos): chỉ tải khi người dùng bấm "Tạo đơn" lần đầu.
const PosOrderDrawer = lazy(() =>
  import('@/features/pos').then((module) => ({ default: module.PosOrderDrawer })),
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
  const filterOnlyLabel = tab === 'ALL' ? undefined : orderFilterOnlyTabs[tab];
  const tabItems = useMemo(
    () => (filterOnlyLabel ? [...orderTabs, { key: tab, label: filterOnlyLabel }] : orderTabs),
    [tab, filterOnlyLabel],
  );
  const page = url.getNumber('page', 1);
  const [createOpen, setCreateOpen] = useState(false);
  // Đã mở POS ít nhất một lần: giữ drawer mounted sau đó để animation đóng và state nội bộ không bị mất.
  const [posMounted, setPosMounted] = useState(false);
  const openCreate = () => {
    setPosMounted(true);
    setCreateOpen(true);
  };
  const [pageSize, setPageSize] = useState(ADMIN_TABLE_DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string>();
  // Đơn đang mở ở drawer chi tiết là ngữ cảnh gợi ý cho Copilot.
  useCopilotPageHints(selectedId ? { orderId: selectedId } : undefined);
  const columnsState = useColumnVisibility(ORDER_COLUMN_ITEMS, 'orders');

  const orders = useListAdminOrders({
    page,
    limit: pageSize,
    statusGroup: tab === 'ALL' ? undefined : tab,
    orderNo: url.get('orderNo'),
    recipientName: url.get('name'),
    recipientPhone: url.get('phone'),
  });
  const rows = useMemo(() => (orders.data?.items ?? []).map(toOrderRow), [orders.data]);

  // Link từ Copilot (`?orderNo=…&open=1`): danh sách đã lọc đúng mã đơn thì mở luôn drawer chi tiết,
  // rồi xoá `open` để đóng drawer xong không bị mở lại. Không thấy đơn (ngoài phạm vi chi nhánh) thì chỉ lọc.
  const requestedOrderNo = url.get('open') === '1' ? url.get('orderNo') : undefined;
  const autoOpenId = requestedOrderNo ? rows.find((row) => row.orderNo === requestedOrderNo)?.id : undefined;
  const { patch: patchUrl } = url;
  useEffect(() => {
    if (!autoOpenId) return;
    setSelectedId(autoOpenId);
    patchUrl({ open: undefined });
  }, [autoOpenId, patchUrl]);

  const { data: summary } = useOrderLiveSummary(true);

  return (
    <PageTransition>
      <ManagementPage
        title="Quản lý đơn hàng"
        // Chỉ số việc cần làm lấy từ API tổng hợp (cùng nguồn với số trên menu và bộ báo đơn mới), tính trên TOÀN
        // bộ đơn trong phạm vi chi nhánh — không phụ thuộc trang/bộ lọc đang xem, nên không gây hiểu nhầm.
        metrics={[
          {
            key: 'today',
            label: 'Đơn hôm nay',
            value: summary?.ordersToday ?? '—',
            icon: <ShoppingCartOutlined />,
            tone: 'blue',
          },
          {
            key: 'pending',
            label: 'Chờ xác nhận',
            value: summary?.pendingConfirmation ?? '—',
            icon: <ClockCircleOutlined />,
            tone: 'orange',
          },
          {
            key: 'payment-review',
            label: 'Chờ đối soát thanh toán',
            value: summary?.paymentsAwaitingReview ?? '—',
            icon: <DollarOutlined />,
            tone: 'red',
            hint: 'Đơn có ảnh chuyển khoản chưa duyệt',
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
                    onClick={openCreate}
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
              width="field"
              value={search.values.name}
              placeholder="Nhập tên người nhận..."
              onChange={search.setter('name')}
            />
            <SearchInput
              icon={<PhoneOutlined className="text-slate-400" />}
              width="field"
              value={search.values.phone}
              placeholder="Nhập số điện thoại..."
              onChange={search.setter('phone')}
            />
          </FilterBar>
        }
      >
        <Tabs
          activeKey={tab}
          items={tabItems}
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
      {posMounted && (
        <Suspense fallback={null}>
          <PosOrderDrawer
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            // Đơn vừa bán có thể không thuộc tab trạng thái đang lọc: về tab "Tất cả", trang 1 để thấy ngay.
            onCreated={() => url.patch({ status: undefined, page: undefined })}
            onNewOrder={openCreate}
          />
        </Suspense>
      )}
    </PageTransition>
  );
}
