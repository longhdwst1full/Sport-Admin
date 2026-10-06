import { useState } from 'react';
import { MailOutlined, PhoneOutlined, PlusOutlined, SettingOutlined, TeamOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { Alert, Button, Select } from 'antd';
import { useListAdminCustomers } from '@/generated/api/customers/customers';
import { PermissionGate } from '@/core/auth/permissions';
import { useAuth } from '@/core/auth/auth-context';
import { ManagementPage } from '@/foundation/management';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ColumnSettingsModal, FilterBar, RefreshButton, useColumnVisibility } from '@/foundation/table';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { PageTransition } from '@/foundation/layout/page-transition';
import { getApiErrorMessage } from '@/lib/api/error';
import { CustomerDetailDrawer } from '../components/customer-detail-drawer';
import { CustomerFormDrawer } from '../components/customer-form-drawer';
import { CustomerTable } from '../components/customer-table';
import { useCustomerLifecycle } from '../hooks/use-customer-lifecycle';
import {
  CUSTOMER_COLUMN_ITEMS,
  CUSTOMER_PAGE_SIZE,
  customerKindOptions,
  customerStatusOptions,
  moneyFormatter,
} from '../constants/customer.constants';
import { toCustomerRowView, type CustomerRowView } from '../model/customer.mapper';

export function CustomersPage() {
  const auth = useAuth();
  // PERMISSION: Customer chưa có đơn chưa mang branch scope; API chỉ cho GLOBAL tạo độc lập.
  const canCreateStandaloneCustomer = auth.currentUser?.scopes.some(
    ({ type }) => type === 'GLOBAL',
  );
  const [kind, setKind] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRowView>();
  const columnsState = useColumnVisibility(CUSTOMER_COLUMN_ITEMS);

  // Mỗi ô là một điều kiện riêng, cộng dồn bằng AND ở backend — giống màn đơn hàng.
  const name = useSearchState();
  const phone = useSearchState();
  const email = useSearchState();
  const [page, setPage] = useListPageReset([
    name.debounced,
    phone.debounced,
    email.debounced,
    kind,
    status,
  ]);

  const customers = useListAdminCustomers({
    page,
    limit: CUSTOMER_PAGE_SIZE,
    name: name.debounced,
    phone: phone.debounced,
    email: email.debounced,
    kind: kind as never,
    status: status as never,
  });
  const rows = (customers.data?.items ?? []).map(toCustomerRowView);

  const lifecycle = useCustomerLifecycle();
  const pageSpend = (customers.data?.items ?? []).reduce(
    (sum, item) => sum + Number(item.lifetimeValue),
    0,
  );

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Chăm sóc khách hàng"
        title="Quản lý khách hàng"
        description="Danh sách khách đã mua hàng, kèm số đơn, số tiền đã chi và lịch sử đặt hàng."
        metrics={[
          {
            key: 'total',
            label: 'Tổng khách khớp lọc',
            value: customers.data?.total ?? 0,
            icon: <TeamOutlined />,
            tone: 'blue',
          },
          {
            key: 'page',
            label: 'Khách trên trang',
            value: rows.length,
            icon: <UserOutlined />,
            tone: 'orange',
          },
          {
            key: 'spend',
            label: 'Chi tiêu của khách trên trang',
            value: moneyFormatter.format(pageSpend),
            icon: <WalletOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <FilterBar
            actions={
              <Button
                icon={<SettingOutlined />}
                onClick={columnsState.open}
                className="text-slate-600"
              >
                Tùy chỉnh cột
              </Button>
            }
          >
            <SearchInput
              icon={<UserOutlined className="text-slate-400" />}
              className="!w-56"
              value={name.value}
              placeholder="Nhập tên khách hàng..."
              onChange={name.setValue}
            />
            <SearchInput
              icon={<PhoneOutlined className="text-slate-400" />}
              className="!w-48"
              value={phone.value}
              placeholder="Nhập số điện thoại..."
              onChange={phone.setValue}
            />
            <SearchInput
              icon={<MailOutlined className="text-slate-400" />}
              className="!w-56"
              value={email.value}
              placeholder="Nhập địa chỉ email..."
              onChange={email.setValue}
            />
            <Select
              allowClear
              className="!w-44"
              placeholder="Chọn loại khách"
              value={kind}
              onChange={setKind}
              options={customerKindOptions}
            />
            <Select
              allowClear
              className="!w-44"
              placeholder="Chọn trạng thái"
              value={status}
              onChange={setStatus}
              options={customerStatusOptions}
            />
            <RefreshButton onRefresh={customers.refetch} loading={customers.isFetching} />
            {canCreateStandaloneCustomer && (
              <PermissionGate permission="customer.manage">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditing(undefined);
                    setFormOpen(true);
                  }}
                >
                  Thêm khách hàng
                </Button>
              </PermissionGate>
            )}
          </FilterBar>
        }
      >
        {customers.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách khách hàng"
            description={getApiErrorMessage(
              customers.error,
              'Vui lòng kiểm tra phiên đăng nhập và quyền xem khách hàng.',
            )}
            action={<Button onClick={() => void customers.refetch()}>Thử lại</Button>}
          />
        )}

        <CustomerTable
          rows={rows}
          loading={customers.isLoading || customers.isFetching}
          page={page}
          total={customers.data?.total ?? 0}
          applyColumns={columnsState.apply}
          onPageChange={setPage}
          onOpen={setSelectedId}
          busyId={lifecycle.busyId}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onToggleStatus={lifecycle.toggleStatus}
          onDelete={lifecycle.remove}
        />

        <CustomerFormDrawer
          open={formOpen}
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(undefined);
          }}
        />
      </ManagementPage>

      <CustomerDetailDrawer customerId={selectedId} onClose={() => setSelectedId(undefined)} />

      <ColumnSettingsModal {...columnsState.modalProps} columns={CUSTOMER_COLUMN_ITEMS} />
    </PageTransition>
  );
}
