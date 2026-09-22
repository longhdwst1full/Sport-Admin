import { DeleteOutlined } from '@ant-design/icons';
import { Button, Empty, InputNumber, Popconfirm, Tag, Tooltip } from 'antd';
import { AdminTable } from '@/foundation/table';
import { moneyFormatter } from '../constants/pos.constants';
import { effectivePrice, lineTotal, type PosCartLine } from '../model/pos-cart';

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
    <AdminTable<PosCartLine>
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
              {line.isBundle && (
                <Tooltip
                  title={line.components
                    .map((component) => `${component.name} × ${component.quantity}`)
                    .join(' · ')}
                >
                  <Tag color="purple" className="mt-1">
                    Combo {line.components.length} món
                  </Tag>
                </Tooltip>
              )}
            </div>
          ),
        },
        {
          title: 'Đơn giá',
          dataIndex: 'unitPrice',
          width: 140,
          align: 'right',
          render: (_value, line) => {
            if (line.unitPrice == null) return <Tag color="red">Chưa có giá</Tag>;
            // Giá flash hiện kèm giá gốc gạch ngang: nhân viên đọc đúng số sẽ thu, và vẫn nói
            // được với khách là đang giảm bao nhiêu.
            if (line.flashPrice == null) return moneyFormatter.format(line.unitPrice);
            return (
              <div>
                <div className="font-semibold text-rose-600">
                  {moneyFormatter.format(line.flashPrice)}
                </div>
                <div className="text-xs text-slate-400 line-through">
                  {moneyFormatter.format(line.unitPrice)}
                </div>
                <Tag color="volcano" className="mt-1">
                  Flash sale
                  {line.flashSaleAvailableQuantity != null
                    ? ` · còn ${line.flashSaleAvailableQuantity} suất`
                    : ''}
                </Tag>
              </div>
            );
          },
        },
        {
          title: 'Số lượng',
          dataIndex: 'quantity',
          width: 120,
          align: 'center',
          render: (_value, line) => (
            <div>
              <InputNumber
                min={1}
                max={999}
                value={line.quantity}
                status={line.quantity > line.availableQuantity ? 'error' : undefined}
                disabled={disabled}
                onChange={(value) => onQuantityChange(line.variantId, Number(value ?? 1))}
              />
              <div
                className={
                  line.quantity > line.availableQuantity
                    ? 'mt-1 text-xs font-semibold text-red-600'
                    : 'mt-1 text-xs text-slate-400'
                }
              >
                Còn {line.availableQuantity}
              </div>
            </div>
          ),
        },
        {
          title: 'Thành tiền',
          width: 150,
          align: 'right',
          render: (_value, line) => (
            <span
              className={
                effectivePrice(line) !== line.unitPrice
                  ? 'font-semibold text-rose-600'
                  : 'font-semibold text-slate-800'
              }
            >
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
