import { useEffect, useState } from 'react';
import { MailOutlined, PhoneOutlined, PlusOutlined, ReloadOutlined, SettingOutlined, TeamOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { Alert, App, Button, Input, Select, Tooltip } from 'antd';
import { useDebounce } from 'use-debounce';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  activateAdminCustomer,
  deactivateAdminCustomer,
  deleteAdminCustomer,
  getGetAdminCustomerQueryKey,
  getListAdminCustomersQueryKey,
  useListAdminCustomers,
} from '@/generated/api/customers/customers';
import { PermissionGate } from '@/core/auth/permissions';
import { useAuth } from '@/core/auth/auth-context';
import { ManagementPage } from '@/foundation/management';
import { ColumnSettingsModal, type ColumnItem } from '@/foundation/table/column-settings-modal';
import { PageTransition } from '@/foundation/layout/page-transition';
import { getApiErrorMessage } from '@/lib/api/error';
import { CustomerDetailDrawer } from '../components/customer-detail-drawer';
import { CustomerFormDrawer } from '../components/customer-form-drawer';
import { CustomerTable } from '../components/customer-table';
import {
  CUSTOMER_PAGE_SIZE,
  customerKindOptions,
  customerStatusOptions,
  moneyFormatter,
} from '../constants/customer.constants';
import { toCustomerRowView, type CustomerRowView } from '../model/customer.mapper';

const CUSTOMER_COLUMNS: ColumnItem[] = [
  { id: 'customer', label: 'Khách hàng', fixed: true },
  { id: 'contact', label: 'Liên hệ' },
  { id: 'kind', label: 'Loại khách' },
  { id: 'orderCount', label: 'Số đơn' },
  { id: 'lifetimeValue', label: 'Đã chi tiêu' },
  { id: 'lastOrder', label: 'Mua gần nhất' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'actions', label: 'Thao tác', fixed: true },
];

export function CustomersPage() {
  const auth = useAuth();
  // PERMISSION: Customer chưa có đơn chưa mang branch scope; API chỉ cho GLOBAL tạo độc lập.
  const canCreateStandaloneCustomer = auth.currentUser?.scopes.some(
    ({ type }) => type === 'GLOBAL',
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [kind, setKind] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRowView>();
  const [busyId, setBusyId] = useState<string>();
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(CUSTOMER_COLUMNS.map((column) => [column.id, true])),
  );

  // Mỗi ô là một điều kiện riêng, cộng dồn bằng AND ở backend — giống màn đơn hàng.
  const [debouncedName] = useDebounce(name.trim(), 350);
  const [debouncedPhone] = useDebounce(phone.trim(), 350);
  const [debouncedEmail] = useDebounce(email.trim(), 350);
  useEffect(
    () => setPage(1),
    [debouncedName, debouncedPhone, debouncedEmail, kind, status],
  );

  const customers = useListAdminCustomers({
    page,
    limit: CUSTOMER_PAGE_SIZE,
    name: debouncedName || undefined,
    phone: debouncedPhone || undefined,
    email: debouncedEmail || undefined,
    kind: kind as never,
    status: status as never,
  });
  const rows = (customers.data?.items ?? []).map(toCustomerRowView);

  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const refreshCustomerQueries = async (customerId?: string) => {
    await queryClient.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() });
    if (customerId) {
      await queryClient.invalidateQueries({ queryKey: getGetAdminCustomerQueryKey(customerId) });
    }
  };

  const statusMutation = useMutation({
    mutationFn: (row: CustomerRowView) => {
      const command = { expectedVersion: row.version };
      return row.status === 'ACTIVE'
        ? deactivateAdminCustomer(row.id, command)
        : activateAdminCustomer(row.id, command);
    },
    onSuccess: async (_result, row) => {
      // CACHE: lifecycle đổi cả list theo status lẫn drawer chi tiết của đúng khách.
      await refreshCustomerQueries(row.id);
      void message.success(
        row.status === 'ACTIVE' ? 'Đã ngừng hoạt động khách hàng.' : 'Đã mở lại khách hàng.',
      );
    },
    onError: (error) =>
      void message.error(getApiErrorMessage(error, 'Không đổi được trạng thái khách hàng.')),
    onSettled: () => setBusyId(undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: CustomerRowView) =>
      deleteAdminCustomer(row.id, { expectedVersion: row.version }),
    onSuccess: async (_result, row) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() });
      queryClient.removeQueries({ queryKey: getGetAdminCustomerQueryKey(row.id) });
      void message.success('Đã xoá hồ sơ khách hàng.');
    },
    onError: (error) =>
      void message.error(
        getApiErrorMessage(error, 'Không xoá được khách hàng. Khách đã có đơn thì chỉ ngừng được.'),
      ),
    onSettled: () => setBusyId(undefined),
  });
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
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <Input
                allowClear
                prefix={<UserOutlined className="text-slate-400" />}
                className="!w-56"
                value={name}
                placeholder="Nhập tên khách hàng..."
                onChange={(event) => setName(event.target.value)}
              />
              <Input
                allowClear
                prefix={<PhoneOutlined className="text-slate-400" />}
                className="!w-48"
                value={phone}
                placeholder="Nhập số điện thoại..."
                onChange={(event) => setPhone(event.target.value)}
              />
              <Input
                allowClear
                prefix={<MailOutlined className="text-slate-400" />}
                className="!w-56"
                value={email}
                placeholder="Nhập địa chỉ email..."
                onChange={(event) => setEmail(event.target.value)}
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
              <Tooltip title="Làm mới dữ liệu">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => void customers.refetch()}
                  loading={customers.isFetching}
                  aria-label="Làm mới"
                />
              </Tooltip>
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
          colVisibility={colVisibility}
          onPageChange={setPage}
          onOpen={setSelectedId}
          busyId={statusMutation.isPending || deleteMutation.isPending ? busyId : undefined}
          onEdit={(row) => {
            setEditing(row);
            setFormOpen(true);
          }}
          onToggleStatus={(row) => {
            setBusyId(row.id);
            statusMutation.mutate(row);
          }}
          onDelete={(row) => {
            setBusyId(row.id);
            deleteMutation.mutate(row);
          }}
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

      <ColumnSettingsModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        columns={CUSTOMER_COLUMNS}
        visibility={colVisibility}
        onChange={setColVisibility}
        onReset={() =>
          setColVisibility(Object.fromEntries(CUSTOMER_COLUMNS.map((column) => [column.id, true])))
        }
      />
    </PageTransition>
  );
}
