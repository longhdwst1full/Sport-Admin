import { CloudUploadOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Avatar, Switch, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import type { ProductStatus } from '@/generated/api/catalog/catalog.schemas';
import { PRODUCT_LIST_PAGE_SIZE_OPTIONS } from '../constants/product-list.constants';
import { PRODUCT_STATUS_PRESENTATION } from '../constants/product-status.constants';
import type { ProductListRow } from '../model/product-list.mapper';

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
    dataIndex: 'productTypeLabel',
    align: 'center',
    width: 120,
    render: (label: string, row) => (
      <Tag className="!rounded-full !border-0 !px-3 !text-xs !font-medium" color={row.isBundle ? 'purple' : 'default'}>
        {label}
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
  canPublish,
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
  /** `catalog.product.manage`: bật/tắt hiển thị. */
  canManage: boolean;
  /** `catalog.product.publish`: xuất bản và lưu trữ (lệnh vòng đời). */
  canPublish: boolean;
  visibilityBusyId?: string;
  archiveBusyId?: string;
  publishBusyId?: string;
  onPageChange: (page: number, pageSize: number) => void;
  onOpen: (slug: string) => void;
  onToggleVisibility: (row: ProductListRow, next: boolean) => void;
  onArchive: (row: ProductListRow) => void;
  onPublish: (row: ProductListRow) => void;
}) {
  // Cột phụ thuộc handler/busy id đổi mỗi render của page nên dựng lại mỗi render, không memo.
  const columns: ColumnsType<ProductListRow> = [
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
        // Mỗi thao tác một nút icon riêng (không gộp menu). Xuất bản và Lưu trữ vẫn đi qua confirm ở page;
        // nút chỉ hiện khi quyền và trạng thái hiện tại cho phép.
        const publishing = publishBusyId === row.id;
        const archiving = archiveBusyId === row.id;
        const busy = publishing || archiving;
        return (
          <>
            <TableActionButton
              label="Xem chi tiết"
              icon={<EyeOutlined />}
              disabled={busy}
              onClick={() => onOpen(row.slug)}
            />
            {canManage && row.status !== 'ARCHIVED' && (
              <TableActionButton label="Sửa" icon={<EditOutlined />} disabled={busy} onClick={() => onOpen(row.slug)} />
            )}
            {canPublish && row.status === 'DRAFT' && (
              <TableActionButton
                label="Xuất bản"
                icon={<CloudUploadOutlined />}
                loading={publishing}
                disabled={busy && !publishing}
                onClick={() => onPublish(row)}
              />
            )}
            {canPublish && row.status !== 'ARCHIVED' && (
              <TableActionButton
                label="Lưu trữ"
                icon={<DeleteOutlined />}
                danger
                loading={archiving}
                disabled={busy && !archiving}
                onClick={() => onArchive(row)}
              />
            )}
          </>
        );
      },
      { width: 150 },
    ),
  ];

  return (
    <AdminTable<ProductListRow>
      rowKey="id"
      emptyEntity="sản phẩm"
      loading={loading}
      dataSource={rows}
      tableLayout="fixed"
      scroll={{
        x: 1220,
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
  );
}
