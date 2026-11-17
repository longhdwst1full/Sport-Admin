import { CalendarOutlined, EyeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Popconfirm, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, type ReactNode } from 'react';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, AdminTable, TableActionButton, col } from '@/foundation/table';
import type { FlashSaleCampaignSummaryDto } from '@/generated/api/promotions/promotions.schemas';
import { flashSaleStatusPresentation } from '../constants/flash-sale.constants';
import { useChangeFlashSaleStatus } from '../hooks/use-change-flash-sale-status';

const COLUMNS: ColumnsType<FlashSaleCampaignSummaryDto> = [
  {
    title: 'Mã',
    dataIndex: 'code',
    fixed: 'left',
    width: 170,
    render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
  },
  col.text<FlashSaleCampaignSummaryDto>('name', 'Tên chiến dịch', { width: 260 }),
  col.dateTime<FlashSaleCampaignSummaryDto>('startsAt', 'Bắt đầu', { width: 170 }),
  col.dateTime<FlashSaleCampaignSummaryDto>('endsAt', 'Kết thúc', { width: 170 }),
  col.number<FlashSaleCampaignSummaryDto>('itemCount', 'Số suất bán', { width: 120 }),
  col.status<FlashSaleCampaignSummaryDto, FlashSaleCampaignSummaryDto['status']>(
    'status',
    'Trạng thái',
    flashSaleStatusPresentation,
    { width: 140 },
  ),
];

/**
 * Hành động nhanh theo trạng thái hiện tại: chiến dịch nháp thì lên lịch, chiến dịch đã lên lịch thì chạy
 * ngay. Các chuyển trạng thái còn lại (huỷ, kết thúc, về nháp) vẫn nằm trong drawer chi tiết.
 */
const QUICK_ACTIONS: Partial<
  Record<FlashSaleCampaignSummaryDto['status'], { to: FlashSaleCampaignSummaryDto['status']; label: string; confirm: string; icon: ReactNode }>
> = {
  DRAFT: { to: 'SCHEDULED', label: 'Lên lịch', confirm: 'Lên lịch chiến dịch', icon: <CalendarOutlined /> },
  SCHEDULED: { to: 'ACTIVE', label: 'Chạy ngay', confirm: 'Chạy ngay chiến dịch', icon: <PlayCircleOutlined /> },
};

export function FlashSaleTable({
  rows,
  loading,
  page,
  total,
  onPageChange,
  onOpen,
  canManage = false,
}: {
  rows: FlashSaleCampaignSummaryDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
  /** Có quyền `catalog.flash_sale.manage` thì mới hiện nút đổi trạng thái nhanh. */
  canManage?: boolean;
}) {
  const statusChange = useChangeFlashSaleStatus();
  const columns = useMemo(
    () => [
      ...COLUMNS,
      col.actions<FlashSaleCampaignSummaryDto>(
        (row) => {
          const quick = canManage ? QUICK_ACTIONS[row.status] : undefined;
          const pending = statusChange.isPending && statusChange.variables?.id === row.id;
          return (
            <span className="inline-flex items-center gap-0.5">
              {quick && (
                <Popconfirm
                  title={`${quick.confirm} "${row.name}"?`}
                  okText="Xác nhận"
                  cancelText="Huỷ"
                  onConfirm={() => statusChange.mutate({ id: row.id, version: row.version, status: quick.to })}
                >
                  <TableActionButton label={`${quick.label} ${row.name}`} title={quick.label} icon={quick.icon} loading={pending} />
                </Popconfirm>
              )}
              <TableActionButton label={`Xem ${row.name}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />
            </span>
          );
        },
        { title: '', width: 104, align: undefined },
      ),
    ],
    [onOpen, canManage, statusChange],
  );

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1134 }}
      locale={{ emptyText: 'Không có chiến dịch phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} chiến dịch`,
        onChange: onPageChange,
      }}
      columns={columns}
    />
  );
}
