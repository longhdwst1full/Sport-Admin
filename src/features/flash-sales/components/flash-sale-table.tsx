import { EyeOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import type { FlashSaleCampaignSummaryDto } from '@/generated/api/promotions/promotions.schemas';
import { FLASH_SALE_PAGE_SIZE, flashSaleStatusPresentation } from '../constants/flash-sale.constants';

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
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    width: 140,
    render: (value: string) => {
      const presentation = flashSaleStatusPresentation[value];
      return <Tag color={presentation?.color ?? 'default'}>{presentation?.label ?? value}</Tag>;
    },
  },
];

export function FlashSaleTable({
  rows,
  loading,
  page,
  total,
  onPageChange,
  onOpen,
}: {
  rows: FlashSaleCampaignSummaryDto[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  const columns = useMemo(
    () => [
      ...COLUMNS,
      col.actions<FlashSaleCampaignSummaryDto>(
        (row) => <TableActionButton label={`Xem ${row.name}`} icon={<EyeOutlined />} onClick={() => onOpen(row.id)} />,
        { title: '', width: 72, align: undefined },
      ),
    ],
    [onOpen],
  );

  return (
    <AdminTable
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1060 }}
      locale={{ emptyText: 'Không có chiến dịch phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize: FLASH_SALE_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} chiến dịch`,
        onChange: onPageChange,
      }}
      columns={columns}
    />
  );
}
