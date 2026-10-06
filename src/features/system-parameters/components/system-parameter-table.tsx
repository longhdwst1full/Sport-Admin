import { DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { Space, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { AdminTable, TableActionButton, col } from '@/foundation/table';
import type { SystemParameterDto } from '@/generated/api/system/system.schemas';
import {
  SYSTEM_PARAMETER_PAGE_SIZE,
  parameterGroupLabels,
  parameterStatusPresentation,
  parameterValueTypeLabels,
} from '../constants/system-parameter.constants';

const PARAMETER_DATA_COLUMNS: ColumnsType<SystemParameterDto> = [
  {
    title: 'Mã tham số',
    dataIndex: 'code',
    fixed: 'left',
    width: 280,
    render: (value: string, row) => (
      <Space size={6}>
        <Typography.Text strong>{value}</Typography.Text>
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
  col.status<SystemParameterDto, string>('status', 'Trạng thái', parameterStatusPresentation, { width: 120 }),
  col.dateTime<SystemParameterDto>('updatedAt', 'Cập nhật'),
];

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
  const columns = useMemo<ColumnsType<SystemParameterDto>>(
    () => [
      ...PARAMETER_DATA_COLUMNS,
      col.actions<SystemParameterDto>(
        (row) =>
          canManage ? (
            <>
              <TableActionButton label={`Sửa tham số ${row.code}`} icon={<EditOutlined />} onClick={() => onEdit(row)} />
              <TableActionButton
                label={row.isSystem ? 'Tham số hệ thống không ngừng dùng được' : 'Ngừng dùng tham số này'}
                danger
                icon={<DeleteOutlined />}
                disabled={row.isSystem || row.status !== 'ACTIVE'}
                onClick={() => onDeactivate(row)}
              />
            </>
          ) : null,
        { key: 'action', title: '', width: 110, align: undefined },
      ),
    ],
    [canManage, onDeactivate, onEdit],
  );

  return (
    <AdminTable
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
      columns={columns}
    />
  );
}
