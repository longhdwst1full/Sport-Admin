import { EditOutlined, PlusOutlined, PoweroffOutlined, ProfileOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Popconfirm, Tag, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage } from '@/foundation/management';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import {
  getListAdminAttributesQueryKey,
  useListAdminAttributes,
  useUpdateAdminAttribute,
} from '@/generated/api/catalog/catalog';
import { AttributeStatus, type AttributeDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { AttributeFormDrawer } from '../components/attribute-form-drawer';
import { ATTRIBUTE_TYPE_LABEL } from '../model/attribute-form';

/**
 * Từ điển thuộc tính cho thông số kỹ thuật sản phẩm (decision D61). Không có nút xoá: thông số của sản
 * phẩm tham chiếu theo mã, nên chỉ ngừng dùng; thông số cũ vẫn hiện nhãn.
 */
export function AttributesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AttributeDto>();
  const attributesQuery = useListAdminAttributes();
  const items = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (attributesQuery.data?.items ?? []).filter(({ code, name }) =>
      !keyword || code.toLowerCase().includes(keyword) || name.toLowerCase().includes(keyword));
  }, [attributesQuery.data?.items, search]);
  const toggle = useUpdateAdminAttribute({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListAdminAttributesQueryKey() });
        void message.success('Đã cập nhật trạng thái thuộc tính.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể cập nhật trạng thái.')),
    },
  });

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Dữ liệu danh mục gốc"
        title="Thuộc tính sản phẩm"
        description="Danh mục thông số kỹ thuật dùng chung (chất liệu, kích thước, màu…) để nhập thống nhất cho mọi sản phẩm."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Tooltip title="Làm mới dữ liệu">
              <Button icon={<ReloadOutlined />} onClick={() => void attributesQuery.refetch()} loading={attributesQuery.isFetching} aria-label="Làm mới" />
            </Tooltip>
            <PermissionGate permission="catalog.product.manage">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelected(undefined); setDrawerOpen(true); }}>
                Thêm thuộc tính
              </Button>
            </PermissionGate>
          </div>
        )}
        metrics={[
          { key: 'total', label: 'Tổng thuộc tính', value: attributesQuery.data?.items.length ?? 0, icon: <ProfileOutlined />, tone: 'blue' },
        ]}
        filters={(
          <Input.Search allowClear className="w-80" value={search} placeholder="Tìm theo mã hoặc tên..." onChange={(event) => setSearch(event.target.value)} />
        )}
      >
        {attributesQuery.isError ? (
          <QueryErrorAlert error={attributesQuery.error} retry={() => void attributesQuery.refetch()} />
        ) : (
          <AdminTable<AttributeDto>
            rowKey="id"
            loading={attributesQuery.isPending}
            dataSource={items}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            columns={[
              { title: 'Mã', dataIndex: 'code', render: (value: string) => <span className="font-mono text-xs">{value}</span> },
              { title: 'Tên', dataIndex: 'name', render: (value: string) => <strong className="text-slate-800">{value}</strong> },
              { title: 'Kiểu', dataIndex: 'dataType', render: (value: AttributeDto['dataType']) => ATTRIBUTE_TYPE_LABEL[value] },
              {
                title: 'Đơn vị / giá trị',
                key: 'detail',
                render: (_, row) => (row.options.length > 0
                  ? row.options.map((option) => <Tag key={option.code}>{option.label}</Tag>)
                  : row.unit ?? '—'),
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                width: 120,
                render: (value: AttributeDto['status']) => <Tag color={value === AttributeStatus.ACTIVE ? 'green' : 'default'}>{value === AttributeStatus.ACTIVE ? 'Đang dùng' : 'Ngừng'}</Tag>,
              },
              {
                title: '',
                key: 'actions',
                width: 100,
                align: 'right',
                render: (_, row) => (
                  <PermissionGate permission="catalog.product.manage">
                    <TableActions>
                      <TableActionButton label={`Sửa thuộc tính ${row.name}`} icon={<EditOutlined />} onClick={() => { setSelected(row); setDrawerOpen(true); }} />
                      <Popconfirm
                        title={row.status === AttributeStatus.ACTIVE ? 'Ngừng dùng thuộc tính?' : 'Dùng lại thuộc tính?'}
                        description="Sản phẩm đã nhập vẫn giữ và hiển thị giá trị cũ."
                        onConfirm={() => toggle.mutate({
                          id: row.id,
                          data: {
                            status: row.status === AttributeStatus.ACTIVE ? AttributeStatus.INACTIVE : AttributeStatus.ACTIVE,
                            expectedVersion: row.version,
                          },
                        })}
                      >
                        <TableActionButton label={row.status === AttributeStatus.ACTIVE ? 'Ngừng dùng' : 'Dùng lại'} danger={row.status === AttributeStatus.ACTIVE} icon={<PoweroffOutlined />} />
                      </Popconfirm>
                    </TableActions>
                  </PermissionGate>
                ),
              },
            ]}
          />
        )}
        <AttributeFormDrawer open={drawerOpen} attribute={selected} onClose={() => setDrawerOpen(false)} />
      </ManagementPage>
    </PageTransition>
  );
}
