import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Switch, Tag, Tooltip } from 'antd';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
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
        fillHeight
        rowKey="id"
        loading={loading}
        dataSource={rows}
        tableLayout="fixed"
        scroll={{
          x: 1120,
          // Giữ header/pagination trong viewport; phần dữ liệu tự cuộn khi đủ 30 dòng.
          y: 'clamp(280px, calc(100vh - 500px), 640px)',
        }}
        locale={{ emptyText: 'Không có sản phẩm phù hợp bộ lọc.' }}
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
            width: 140,
            fixed: 'right',
            render: (_value, row) => (
              <TableActions>
                <TableActionButton
                  label={`Xem sản phẩm ${row.name}`}
                  icon={<EditOutlined />}
                  className="!text-slate-500 hover:!bg-slate-100 hover:!text-admin-600"
                  onClick={() => onOpen(row.slug)}
                />
                {canManage && row.status === 'DRAFT' && (
                  <TableActionButton
                    label={`Xuất bản sản phẩm ${row.name}`}
                    icon={<CloudUploadOutlined />}
                    className="!text-emerald-600 hover:!bg-emerald-50"
                    loading={publishBusyId === row.id}
                    onClick={() => onPublish(row)}
                  />
                )}
                {canManage && row.status !== 'ARCHIVED' && (
                  <TableActionButton
                    label={`Lưu trữ sản phẩm ${row.name}`}
                    danger
                    icon={<DeleteOutlined />}
                    loading={archiveBusyId === row.id}
                    onClick={() => onArchive(row)}
                  />
                )}
              </TableActions>
            ),
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
