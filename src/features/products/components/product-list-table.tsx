import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Switch, Tag, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import { useMemo } from 'react';
import { PRODUCT_LIST_PAGE_SIZE_OPTIONS } from '../constants/product-list.constants';
import { PRODUCT_STATUS_PRESENTATION } from '../constants/product-status.constants';
import type { ProductListRow } from '../model/product-list.mapper';
import type { ProductStatus } from '@/generated/api/catalog/catalog.schemas';

/** Cột dữ liệu đứng trước công tắc hiển thị; không phụ thuộc quyền/handler. */
const PRODUCT_LEADING_COLUMNS: ColumnsType<ProductListRow> = [
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
          src={
            row.imageUrl && (
              <img src={row.imageUrl} alt={row.name} width={48} height={48} loading="lazy" decoding="async" />
            )
          }
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
  col.status<ProductListRow, ProductStatus>('status', 'Trạng thái', PRODUCT_STATUS_PRESENTATION, { align: 'center', width: 150 }),
];

const PRODUCT_VERSION_COLUMN: ColumnsType<ProductListRow>[number] = {
  title: 'Ver',
  dataIndex: 'version',
  align: 'center',
  width: 60,
  render: (value: number) => <span className="text-xs text-slate-400">v{value}</span>,
};

export function ProductListTable({
  rows,
  loading,
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
}: {
  rows: ProductListRow[];
  loading: boolean;
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
}) {
  const columns = useMemo<ColumnsType<ProductListRow>>(
    () => [
      ...PRODUCT_LEADING_COLUMNS,
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
      PRODUCT_VERSION_COLUMN,
      col.actions<ProductListRow>(
        (row) => {
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
          );
        },
        { title: '', width: 56 },
      ),
    ],
    [archiveBusyId, canManage, onArchive, onOpen, onPublish, onToggleVisibility, publishBusyId, visibilityBusyId],
  );

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
        columns={columns}
      />
    </>
  );
}
