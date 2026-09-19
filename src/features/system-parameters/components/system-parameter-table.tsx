import { DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { SystemParameterDto } from '@/generated/api/system/models';
import {
  SYSTEM_PARAMETER_PAGE_SIZE,
  parameterGroupLabels,
  parameterStatusPresentation,
  parameterValueTypeLabels,
} from '../constants/system-parameter.constants';

export function SystemParameterTable({
  rows,
  loading,
  page,
  total,
  canManage,
  onPageChange,
  onEdit,
  onDeactivate,
}: {
  rows: SystemParameterDto[];
  loading: boolean;
  page: number;
  total: number;
  canManage: boolean;
  onPageChange: (page: number) => void;
  onEdit: (row: SystemParameterDto) => void;
  onDeactivate: (row: SystemParameterDto) => void;
}) {
  return (
    <Table
      rowKey="id"
      dataSource={rows}
      loading={loading}
      tableLayout="fixed"
      scroll={{ x: 1240 }}
      locale={{ emptyText: 'Không có tham số phù hợp bộ lọc.' }}
      pagination={{
        current: page,
        pageSize: SYSTEM_PARAMETER_PAGE_SIZE,
        total,
        showSizeChanger: false,
        showTotal: (value) => `${value} tham số`,
        onChange: onPageChange,
      }}
      columns={[
        {
          title: 'Mã tham số',
          dataIndex: 'code',
          fixed: 'left',
          width: 280,
          render: (value: string, row) => (
            <Space size={6}>
              <Typography.Text strong copyable>{value}</Typography.Text>
              {row.isSystem && (
                <Tooltip title="Tham số hệ thống: code đang đọc theo mã này, chỉ sửa được giá trị">
                  <LockOutlined className="text-slate-400" />
                </Tooltip>
              )}
            </Space>
          ),
        },
        { title: 'Tên hiển thị', dataIndex: 'label', width: 240 },
        {
          title: 'Nhóm',
          dataIndex: 'groupCode',
          width: 130,
          render: (value: string) => parameterGroupLabels[value] ?? value,
        },
        {
          title: 'Giá trị',
          key: 'value',
          width: 160,
          align: 'right',
          render: (_, row) => (
            <Space size={4}>
              <Typography.Text strong>{row.value}</Typography.Text>
              {row.unit ? <span className="text-xs text-slate-400">{row.unit}</span> : null}
            </Space>
          ),
        },
        {
          title: 'Khoảng hợp lệ',
          key: 'range',
          width: 140,
          render: (_, row) =>
            row.minValue === null && row.maxValue === null ? (
              <span className="text-slate-400">—</span>
            ) : (
              <span className="text-xs text-slate-500">
                {row.minValue ?? '−∞'} … {row.maxValue ?? '∞'}
              </span>
            ),
        },
        {
          title: 'Kiểu',
          dataIndex: 'valueType',
          width: 120,
          render: (value: string) => parameterValueTypeLabels[value] ?? value,
        },
        {
          title: 'Công khai',
          dataIndex: 'isPublic',
          width: 110,
          render: (value: boolean) =>
            value ? <Tag color="blue">Storefront đọc được</Tag> : <span className="text-slate-400">—</span>,
        },
        {
          title: 'Trạng thái',
          dataIndex: 'status',
          width: 120,
          render: (value: string) => {
            const presentation = parameterStatusPresentation[value];
            return <Tag color={presentation?.color ?? 'default'}>{presentation?.label ?? value}</Tag>;
          },
        },
        {
          title: 'Cập nhật',
          dataIndex: 'updatedAt',
          width: 160,
          render: (value: string) => new Date(value).toLocaleString('vi-VN'),
        },
        {
          title: '',
          key: 'action',
          fixed: 'right',
          width: 110,
          render: (_, row) =>
            canManage ? (
              <Space size={4}>
                <Tooltip title="Sửa giá trị">
                  <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(row)} />
                </Tooltip>
                <Tooltip
                  title={
                    row.isSystem
                      ? 'Tham số hệ thống không ngừng dùng được'
                      : 'Ngừng dùng tham số này'
                  }
                >
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled={row.isSystem || row.status !== 'ACTIVE'}
                    onClick={() => onDeactivate(row)}
                  />
                </Tooltip>
              </Space>
            ) : null,
        },
      ]}
    />
  );
}
