import { EyeOutlined } from '@ant-design/icons';
import { Button, Table, Tag, Typography } from 'antd';
import type { FlashSaleCampaignSummaryDto } from '@/generated/api/promotions/models';
import { FLASH_SALE_PAGE_SIZE, flashSaleStatusPresentation } from '../constants/flash-sale.constants';

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
  return (
    <Table
      rowKey="id"
      dataSource={rows}
      loading={loading}
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
      columns={[
        {
          title: 'Mã',
          dataIndex: 'code',
          fixed: 'left',
          width: 170,
          render: (value: string) => <Typography.Text strong copyable>{value}</Typography.Text>,
        },
        { title: 'Tên chiến dịch', dataIndex: 'name', width: 260 },
        {
          title: 'Bắt đầu',
          dataIndex: 'startsAt',
          width: 170,
          render: (value: string) => new Date(value).toLocaleString('vi-VN'),
        },
        {
          title: 'Kết thúc',
          dataIndex: 'endsAt',
          width: 170,
          render: (value: string) => new Date(value).toLocaleString('vi-VN'),
        },
        { title: 'Số suất bán', dataIndex: 'itemCount', width: 120, align: 'right' },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 140,
          render: (value: string) => {
            const presentation = flashSaleStatusPresentation[value];
            return <Tag color={presentation?.color ?? 'default'}>{presentation?.label ?? value}</Tag>;
          },
        },
        {
          title: '',
          key: 'action',
          fixed: 'right',
          width: 110,
          render: (_, row) => (
            <Button size="small" icon={<EyeOutlined />} onClick={() => onOpen(row.id)}>
              Chi tiết
            </Button>
          ),
        },
      ]}
    />
  );
}
