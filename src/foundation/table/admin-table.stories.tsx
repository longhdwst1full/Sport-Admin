import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AdminTable } from './admin-table';
import { TableActionButton, TableActions } from './table-actions';

interface DemoRow {
  id: string;
  name: string;
  code: string;
  status: string;
}

const rows: DemoRow[] = Array.from({ length: 24 }, (_, index) => ({
  id: String(index + 1),
  name: `Bản ghi quản trị ${index + 1}`,
  code: `CODE-${String(index + 1).padStart(3, '0')}`,
  status: index % 2 ? 'ACTIVE' : 'DRAFT',
}));

const meta = {
  title: 'Foundation/Table/AdminTable',
  component: AdminTable<DemoRow>,
  parameters: { layout: 'padded' },
  args: {
    rowKey: 'id',
    dataSource: rows,
    columns: [
      { title: 'Tên', dataIndex: 'name', fixed: 'left', width: 280 },
      { title: 'Mã', dataIndex: 'code', width: 180 },
      { title: 'Trạng thái', dataIndex: 'status', width: 160 },
      {
        title: '',
        key: 'actions',
        fixed: 'right',
        width: 120,
        render: (_value, row) => (
          <TableActions>
            <TableActionButton label={`Xem ${row.name}`} icon={<EyeOutlined />} />
            <TableActionButton label={`Sửa ${row.name}`} icon={<EditOutlined />} />
            <TableActionButton danger label={`Xóa ${row.name}`} icon={<DeleteOutlined />} />
          </TableActions>
        ),
      },
    ],
  },
} satisfies Meta<typeof AdminTable<DemoRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { dataSource: [] } };
