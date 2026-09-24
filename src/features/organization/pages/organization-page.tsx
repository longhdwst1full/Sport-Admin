import { CACHE_POLICY } from '@/app/config/query-cache-policy';
import {
  BankOutlined,
  EditOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  LinkOutlined,
  PlusOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Descriptions, Popconfirm, Typography } from 'antd';
import { useState } from 'react';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import {
  getListAdminBranchesQueryKey,
  getListAdminWarehousesQueryKey,
  useActivateAdminBranchWithWarehouse,
  useDeactivateAdminBranchWithWarehouse,
  useListAdminBranches,
  useListAdminWarehouses,
} from '@/generated/api/organization/organization';
import type { BranchDto, OrganizationStatus, WarehouseDto } from '@/generated/api/organization/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { OrganizationFormDrawer } from '../components/organization-form-drawer';

interface BranchWarehouseRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  warehouseCode: string;
  warehouseName: string;
  address: string;
  region: string;
  status: OrganizationStatus;
  branch: BranchDto;
  warehouse?: WarehouseDto;
}

const organizationStatuses: Record<OrganizationStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: 'Đang hoạt động' },
  INACTIVE: { color: 'default', label: 'Ngừng hoạt động' },
};

// SECURITY: mọi endpoint branch/kho khai báo đồng thời org.branch.manage và org.warehouse.manage,
// nên UI phải yêu cầu đủ cả hai; thiếu một quyền mà vẫn hiện nút thì thao tác chắc chắn 403.
const BRANCH_WAREHOUSE_MANAGE = ['org.branch.manage', 'org.warehouse.manage'] as const;

export function OrganizationPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchDto>();
  const canViewWarehouses = useCan('org.warehouse.view');
  const branchesQuery = useListAdminBranches({ query: { ...CACHE_POLICY.REFERENCE } });
  const warehousesQuery = useListAdminWarehouses({ query: { enabled: canViewWarehouses } });
  const branches = branchesQuery.data?.items ?? [];
  const warehouses = warehousesQuery.data?.items ?? [];
  const rows: BranchWarehouseRow[] = branches.map((branch) => {
    const warehouse = warehouses.find((item) => item.branchId === branch.id);
    return {
      branchId: branch.id,
      branchCode: branch.code,
      branchName: branch.name,
      warehouseCode: warehouse?.code ?? 'Chưa liên kết',
      warehouseName: warehouse?.name ?? 'Chưa có kho',
      address: [branch.address.addressLine, branch.address.district, branch.address.province].join(
        ', ',
      ),
      region: branch.address.province,
      status: branch.status,
      branch,
      warehouse,
    };
  });
  const regionCount = new Set(branches.map((branch) => branch.address.province)).size;
  const hasError = branchesQuery.isError || (canViewWarehouses && warehousesQuery.isError);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminBranchesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminWarehousesQueryKey() }),
    ]);
  };
  const lifecycleOptions = {
    mutation: {
      onSuccess: async () => {
        await refresh();
        void message.success('Đã cập nhật trạng thái chi nhánh và kho.');
      },
      onError: (error: unknown) =>
        void message.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái.')),
    },
  };
  const activate = useActivateAdminBranchWithWarehouse(lifecycleOptions);
  const deactivate = useDeactivateAdminBranchWithWarehouse(lifecycleOptions);
  const selectedWarehouse = selectedBranch
    ? warehouses.find((item) => item.branchId === selectedBranch.id)
    : undefined;

  return (
    <ManagementPage
      eyebrow="Organization"
      title="Chi nhánh & kho"
      description="Cấu trúc vận hành V1: mỗi chi nhánh sở hữu đúng một kho bán hàng."
      actions={
        <PermissionGate permission={BRANCH_WAREHOUSE_MANAGE}>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedBranch(undefined);
              setDrawerOpen(true);
            }}
          >
            Thêm chi nhánh & kho
          </Button>
        </PermissionGate>
      }
      metrics={[
        { key: 'branches', label: 'Chi nhánh', value: branches.length, icon: <BankOutlined /> },
        {
          key: 'warehouses',
          label: 'Kho bán hàng',
          value: warehouses.length,
          icon: <InboxOutlined />,
          tone: 'orange',
        },
        {
          key: 'mapping',
          label: 'Quan hệ V1',
          value: '1 : 1',
          icon: <LinkOutlined />,
          tone: 'green',
          hint: 'Một branch — một warehouse',
        },
        {
          key: 'regions',
          label: 'Khu vực',
          value: regionCount,
          icon: <EnvironmentOutlined />,
          tone: 'blue',
        },
      ]}
    >
      {hasError && (
        <div className="mb-4">
          <QueryErrorAlert
            error={branchesQuery.error ?? warehousesQuery.error}
            retry={() => void Promise.all([branchesQuery.refetch(), warehousesQuery.refetch()])}
          />
        </div>
      )}
      <AdminTable
        rowKey="branchId"
        loading={branchesQuery.isPending || (canViewWarehouses && warehousesQuery.isPending)}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1340 }}
        expandable={{
          // Dòng mở rộng chỉ để xem thông tin bị cắt ở cột hẹp; không lặp lại thứ cột đã hiện.
          expandedRowRender: (row) => (
            <Descriptions size="small" column={{ xs: 1, md: 2 }} className="py-2">
              <Descriptions.Item label="Địa chỉ đầy đủ">{row.address}</Descriptions.Item>
              <Descriptions.Item label="Mã kho">{row.warehouseCode}</Descriptions.Item>
            </Descriptions>
          ),
        }}
        columns={[
          {
            title: 'Chi nhánh',
            dataIndex: 'branchName',
            width: 260,
            render: (value, row) => (
              <div className="min-w-0">
                <strong className="block truncate" title={String(value)}>
                  {value}
                </strong>
                <Typography.Text code className="text-xs">
                  {row.branchCode}
                </Typography.Text>
              </div>
            ),
          },
          {
            title: 'Kho duy nhất',
            dataIndex: 'warehouseName',
            width: 240,
            ellipsis: true,
            render: (value) => <strong>{value}</strong>,
          },
          { title: 'Khu vực', dataIndex: 'region', width: 160, ellipsis: true },
          // Địa chỉ dài hơn mọi cột khác; cắt ở đây và cho xem đầy đủ ở dòng mở rộng.
          { title: 'Địa chỉ', dataIndex: 'address', width: 320, ellipsis: true },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 140,
            render: (value: OrganizationStatus) => (
              <StatusTag status={value} presentations={organizationStatuses} />
            ),
          },
          {
            title: '',
            key: 'actions',
            width: 100,
            align: 'right',
            // Ghim phải để không phải cuộn ngang mới bấm được Sửa/Ngừng.
            fixed: 'right',
            render: (_, row: BranchWarehouseRow) => (
              <PermissionGate permission={BRANCH_WAREHOUSE_MANAGE}>
                <TableActions>
                  <TableActionButton
                    label={`Sửa chi nhánh ${row.branchName}`}
                    icon={<EditOutlined />}
                    disabled={!row.warehouse}
                    onClick={() => {
                      setSelectedBranch(row.branch);
                      setDrawerOpen(true);
                    }}
                  />
                  <Popconfirm
                    title={row.status === 'ACTIVE' ? 'Ngừng chi nhánh và kho?' : 'Kích hoạt lại chi nhánh và kho?'}
                    description="Hai bản ghi sẽ đổi trạng thái trong cùng transaction."
                    disabled={!row.warehouse}
                    onConfirm={() => {
                      if (!row.warehouse) return;
                      const variables = {
                        id: row.branch.id,
                        data: {
                          expectedVersion: row.branch.version,
                          warehouseExpectedVersion: row.warehouse.version,
                        },
                      };
                      if (row.status === 'ACTIVE') deactivate.mutate(variables);
                      else activate.mutate(variables);
                    }}
                  >
                    <TableActionButton
                      label={row.status === 'ACTIVE' ? 'Ngừng chi nhánh và kho' : 'Kích hoạt chi nhánh và kho'}
                      danger={row.status === 'ACTIVE'}
                      disabled={!row.warehouse}
                      icon={<PoweroffOutlined />}
                    />
                  </Popconfirm>
                </TableActions>
              </PermissionGate>
            ),
          },
        ]}
      />
      <OrganizationFormDrawer
        open={drawerOpen}
        branch={selectedBranch}
        warehouse={selectedWarehouse}
        onClose={() => setDrawerOpen(false)}
      />
    </ManagementPage>
  );
}
