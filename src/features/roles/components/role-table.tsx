import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { RoleDto } from '@/generated/api/iam/models';

export function RoleTable({
  rows,
  loading,
  canManage,
  onEdit,
  onDelete,
}: {
  rows: RoleDto[];
  loading: boolean;
  canManage: boolean;
  onEdit: (row: RoleDto) => void;
  onDelete: (row: RoleDto) => void;
}) {
  return (
    <Table<RoleDto>
      rowKey="id"
      loading={loading}
      dataSource={rows}
      pagination={false}
      columns={[
        {
          title: 'Vai trò',
          dataIndex: 'name',
          render: (_value, row) => (
            <div>
              <div className="font-medium">
                {row.name}
                {row.system && (
                  <Tag color="blue" className="ml-2">
                    Hệ thống
                  </Tag>
                )}
                {row.status === 'INACTIVE' && (
                  <Tag color="default" className="ml-2">
                    Ngừng dùng
                  </Tag>
                )}
              </div>
              <Typography.Text type="secondary" className="text-xs">
                {row.code}
              </Typography.Text>
            </div>
          ),
        },
        {
          title: 'Mô tả',
          dataIndex: 'description',
          render: (value: string | undefined) => value ?? '—',
        },
        {
          title: 'Số quyền',
          dataIndex: 'permissionCodes',
          width: 110,
          align: 'center',
          render: (codes: string[]) => codes.length,
        },
        {
          title: '',
          key: 'actions',
          width: 160,
          align: 'right',
          render: (_value, row) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} disabled={!canManage} onClick={() => onEdit(row)}>
                Sửa
              </Button>
              <Tooltip title={row.system ? 'Vai trò hệ thống không xoá được' : undefined}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!canManage || row.system}
                  onClick={() => onDelete(row)}
                />
              </Tooltip>
            </Space>
          ),
        },
      ]}
    />
  );
}
