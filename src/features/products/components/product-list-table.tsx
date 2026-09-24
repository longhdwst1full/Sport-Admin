import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Switch, Tag, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { AdminTable, TableActions } from '@/foundation/table';
import type { ReactNode } from 'react';
import { StatusTag } from '@/foundation/management';
import { PRODUCT_LIST_PAGE_SIZE_OPTIONS } from '../constants/product-list.constants';
import type { ProductListRow } from '../model/product-list.mapper';

const statusPresentation: Record<
  string,
  { color: string; label: string; icon?: ReactNode }
> = {
  PUBLISHED: {
    color: 'green',
    label: 'Đang bán',
    icon: <CheckCircleOutlined className="text-emerald-600" />,
  },
  DRAFT: { color: 'blue', label: 'Nháp' },
  ARCHIVED: { color: 'default', label: 'Lưu trữ' },
};

export function ProductListTable({
  rows,
  loading,
  fetching,
  page,
  pageSize,
  total,
  canManage,
  visibilityBusyId,
  archiveBusyId,
  publishBusyId,
  onPageChange,
  onOpen,
  onToggleVisibility,
  onArchive,
  onPublish,
  onRefresh,
}: {
  rows: ProductListRow[];
  loading: boolean;
  fetching: boolean;
  page: number;
  pageSize: number;
  total: number;
  canManage: boolean;
  visibilityBusyId?: string;
  archiveBusyId?: string;
  publishBusyId?: string;
  onPageChange: (page: number, pageSize: number) => void;
  onOpen: (slug: string) => void;
  onToggleVisibility: (row: ProductListRow, next: boolean) => void;
  onArchive: (row: ProductListRow) => void;
  onPublish: (row: ProductListRow) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <AdminTable<ProductListRow>
        rowKey="id"
        emptyEntity="sản phẩm"
        loading={loading}
        dataSource={rows}
        tableLayout="fixed"
        scroll={{
          x: 1120,
          // Giữ header/pagination trong viewport; phần dữ liệu tự cuộn khi đủ 30 dòng.
          y: 'clamp(280px, calc(100vh - 500px), 640px)',
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: PRODUCT_LIST_PAGE_SIZE_OPTIONS,
          responsive: true,
          showTotal: (value) => `${value} sản phẩm`,
          onChange: onPageChange,
        }}
        columns={[
          {
            title: 'Sản phẩm',
            dataIndex: 'name',
            width: 380,
            fixed: 'left',
            render: (_value, row) => (
              <div className="flex items-center gap-3">
                <Avatar
                  shape="square"
                  size={48}
                  src={row.imageUrl}
                  className="!rounded-xl !border !border-slate-100 !shadow-soft"
                >
                  {row.name.slice(0, 1)}
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">{row.name}</div>
                  <div className="truncate text-xs text-slate-400">{row.secondaryLabel}</div>
                </div>
              </div>
            ),
          },
          {
            title: 'Giá đã VAT',
            dataIndex: 'priceLabel',
            align: 'right',
            width: 170,
            render: (value: string) => (
              <span className={value === '—' ? 'text-slate-400' : 'font-semibold text-slate-800'}>
                {value}
              </span>
            ),
          },
          {
            title: 'Loại',
            dataIndex: 'productType',
            align: 'center',
            width: 120,
            render: (value: string) => (
              <Tag
                className="!rounded-full !border-0 !px-3 !text-xs !font-medium"
                color={value === 'BUNDLE' ? 'purple' : 'default'}
              >
                {value === 'BUNDLE' ? 'Combo' : 'Thường'}
              </Tag>
            ),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            align: 'center',
            width: 150,
            render: (value: string) => (
              <StatusTag status={value} presentations={statusPresentation} />
            ),
          },
          {
            title: 'Hiện trên web',
            key: 'isPublished',
            align: 'center',
            width: 120,
            render: (_value, row) => (
              <Tooltip
                title={
                  row.status === 'PUBLISHED'
                    ? 'Bật/tắt hiển thị trên website'
                    : 'Chỉ sản phẩm đã xuất bản mới hiện trên website'
                }
              >
                <span>
                  <Switch
                    size="small"
                    checked={row.isPublished}
                    disabled={row.status !== 'PUBLISHED' || !canManage}
                    loading={visibilityBusyId === row.id}
                    onChange={(next) => onToggleVisibility(row, next)}
                  />
                </span>
              </Tooltip>
            ),
          },
          {
            title: 'Ver',
            dataIndex: 'version',
            align: 'center',
            width: 60,
            render: (value: number) => <span className="text-xs text-slate-400">v{value}</span>,
          },
          {
            title: '',
            key: 'actions',
            align: 'right',
            width: 56,
            fixed: 'right',
            render: (_value, row) => {
              // Gom thao tác vào menu ba chấm để cột giữ hẹp khi thêm hành động. Xuất bản và Lưu trữ
              // vẫn đi qua confirm ở page; mục chỉ hiện khi trạng thái hiện tại cho phép.
              const items: NonNullable<MenuProps['items']> = [
                { key: 'open', icon: <EditOutlined />, label: 'Xem / sửa' },
              ];
              if (canManage && row.status === 'DRAFT') {
                items.push({ key: 'publish', icon: <CloudUploadOutlined />, label: 'Xuất bản' });
              }
              if (canManage && row.status !== 'ARCHIVED') {
                items.push({ type: 'divider' });
                items.push({ key: 'archive', icon: <DeleteOutlined />, label: 'Lưu trữ', danger: true });
              }
              const busy = publishBusyId === row.id || archiveBusyId === row.id;
              return (
                <TableActions>
                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    disabled={busy}
                    menu={{
                      items,
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'open') onOpen(row.slug);
                        if (key === 'publish') onPublish(row);
                        if (key === 'archive') onArchive(row);
                      },
                    }}
                  >
                    {/* Button trực tiếp (không qua Tooltip) để Dropdown gắn được sự kiện click vào nó. */}
                    <Button
                      type="text"
                      size="small"
                      aria-label={`Thao tác với sản phẩm ${row.name}`}
                      icon={<MoreOutlined />}
                      loading={busy}
                      className="!rounded-lg !text-slate-500 hover:!bg-slate-100"
                    />
                  </Dropdown>
                </TableActions>
              );
            },
          },
        ]}
      />
      <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
        <Tooltip title="Làm mới danh sách">
          <Button
            type="text"
            aria-label="Làm mới danh sách sản phẩm"
            icon={<ReloadOutlined />}
            loading={fetching}
            className="!text-slate-500 hover:!text-emerald-600"
            onClick={onRefresh}
          />
        </Tooltip>
      </div>
    </>
  );
}
