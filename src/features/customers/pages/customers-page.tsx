import { useMemo, useState } from 'react';
import { MailOutlined, PhoneOutlined, PlusOutlined, SettingOutlined, TeamOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { useListAdminCustomers } from '@/generated/api/customers/customers';
import { CustomerKind, CustomerStatus } from '@/generated/api/customers/customers.schemas';
import { PermissionGate } from '@/core/auth/permissions';
import { useAuth } from '@/core/auth/auth-context';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { SearchInput } from '@/foundation/inputs/search-input';
import {
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  ColumnSettingsModal,
  FilterBar,
  RefreshButton,
  useColumnVisibility,
} from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { PageTransition } from '@/foundation/layout/page-transition';
import { CustomerDetailDrawer } from '../components/customer-detail-drawer';
import { CustomerFormDrawer } from '../components/customer-form-drawer';
import { CustomerTable } from '../components/customer-table';
import { useCustomerLifecycle } from '../hooks/use-customer-lifecycle';
import {
  CUSTOMER_COLUMN_ITEMS,
  customerKindOptions,
  customerStatusOptions,
  moneyFormatter,
} from '../constants/customer.constants';
import { toCustomerRowView, type CustomerRowView } from '../model/customer.mapper';

/**
 * Bộ lọc và trang nằm trên URL (`name`, `phone`, `email`, `kind`, `status`, `page`) để F5/Back/gửi link
 * giữ nguyên. Ô tìm kiếm giữ chữ đang gõ ở state cục bộ và ghi giá trị đã debounce lên URL; query đọc
 * URL. Đổi bộ lọc thì xoá `page`.
 */
export function CustomersPage() {
  const auth = useAuth();
  // PERMISSION: Customer chưa có đơn chưa mang branch scope; API chỉ cho GLOBAL tạo độc lập.
  const canCreateStandaloneCustomer = auth.currentUser?.scopes.some(
    ({ type }) => type === 'GLOBAL',
  );
  // Mỗi ô là một điều kiện riêng, cộng dồn bằng AND ở backend — giống màn đơn hàng.
  const search = useUrlSearch(['name', 'phone', 'email']);
  const { url } = search;
  const kind = url.getEnum('kind', CustomerKind);
  const status = url.getEnum('status', CustomerStatus);
  const page = url.getNumber('page', 1);
  const [selectedId, setSelectedId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRowView>();
  const columnsState = useColumnVisibility(CUSTOMER_COLUMN_ITEMS);


  const customers = useListAdminCustomers({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    name: url.get('name'),
    phone: url.get('phone'),
    email: url.get('email'),
    kind,
    status,
  });
  const rows = useMemo(() => (customers.data?.items ?? []).map(toCustomerRowView), [customers.data]);

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
              <>
                <RefreshButton onRefresh={customers.refetch} loading={customers.isFetching} />
                <Button
                  icon={<SettingOutlined />}
                  onClick={columnsState.open}
                  className="text-slate-600"
                >
                  Tuỳ chỉnh cột
                </Button>
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
              </>
            }
          >
            <SearchInput
              icon={<UserOutlined className="text-slate-400" />}
              className="!w-56"
              value={search.values.name}
              placeholder="Nhập tên khách hàng..."
              onChange={search.setter('name')}
            />
            <SearchInput
              icon={<PhoneOutlined className="text-slate-400" />}
              className="!w-48"
              value={search.values.phone}
              placeholder="Nhập số điện thoại..."
              onChange={search.setter('phone')}
            />
            <SearchInput
              icon={<MailOutlined className="text-slate-400" />}
              className="!w-56"
              value={search.values.email}
              placeholder="Nhập địa chỉ email..."
              onChange={search.setter('email')}
            />
            <Select
              allowClear
              className="!w-44"
              placeholder="Chọn loại khách"
              value={kind}
              onChange={(value?: string) => url.patch({ kind: value, page: undefined })}
              options={customerKindOptions}
            />
            <Select
              allowClear
              className="!w-44"
              placeholder="Chọn trạng thái"
              value={status}
              onChange={(value?: string) => url.patch({ status: value, page: undefined })}
              options={customerStatusOptions}
            />
          </FilterBar>
        }
      >
        {customers.isError && (
          <QueryErrorAlert
            message="Không tải được danh sách khách hàng"
            error={customers.error}
            retry={() => void customers.refetch()}
          />
        )}

        <CustomerTable
          rows={rows}
          loading={customers.isLoading || customers.isFetching}
          page={page}
          total={customers.data?.total ?? 0}
          applyColumns={columnsState.apply}
          onPageChange={(nextPage: number) => url.set('page', nextPage > 1 ? nextPage : undefined)}
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
