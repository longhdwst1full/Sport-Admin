import { DeleteOutlined } from '@ant-design/icons';
import { Button, Empty, InputNumber, Popconfirm, Table, Tag } from 'antd';
import { moneyFormatter } from '../constants/pos.constants';
import { lineTotal, type PosCartLine } from '../model/pos-cart';

export function PosCartTable({
  lines,
  onQuantityChange,
  onRemove,
  disabled,
}: {
  lines: PosCartLine[];
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  disabled: boolean;
}) {
  if (lines.length === 0) {
    return (
      <Empty
        className="my-12"
        description="Chưa có sản phẩm nào. Chọn sản phẩm ở cột bên trái để bắt đầu."
      />
    );
  }

  return (
    <Table<PosCartLine>
      size="small"
      rowKey="variantId"
      dataSource={lines}
      pagination={false}
      columns={[
        {
          title: 'Sản phẩm',
          dataIndex: 'name',
          render: (_value, line) => (
            <div>
              <div className="font-semibold text-slate-800">{line.name}</div>
              <div className="font-mono text-xs text-slate-500">{line.sku}</div>
            </div>
          ),
        },
        {
          title: 'Đơn giá',
          dataIndex: 'unitPrice',
          width: 140,
          align: 'right',
          render: (_value, line) =>
            line.unitPrice == null ? (
              <Tag color="red">Chưa có giá</Tag>
            ) : (
              moneyFormatter.format(line.unitPrice)
            ),
        },
        {
          title: 'Số lượng',
          dataIndex: 'quantity',
          width: 120,
          align: 'center',
          render: (_value, line) => (
            <InputNumber
              min={1}
              max={999}
              value={line.quantity}
              disabled={disabled}
              onChange={(value) => onQuantityChange(line.variantId, Number(value ?? 1))}
            />
          ),
        },
        {
          title: 'Thành tiền',
          width: 150,
          align: 'right',
          render: (_value, line) => (
            <span className="font-semibold text-slate-800">
              {moneyFormatter.format(lineTotal(line))}
            </span>
          ),
        },
        {
          title: '',
          width: 56,
          align: 'center',
          render: (_value, line) => (
            <Popconfirm
              title="Bỏ sản phẩm này khỏi đơn?"
              okText="Bỏ"
              cancelText="Giữ lại"
              disabled={disabled}
              onConfirm={() => onRemove(line.variantId)}
            >
              <Button danger type="text" icon={<DeleteOutlined />} disabled={disabled} />
            </Popconfirm>
          ),
        },
      ]}
    />
  );
}
