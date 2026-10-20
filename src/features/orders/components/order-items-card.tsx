import type { ReactNode } from 'react';
import { ShoppingOutlined } from '@ant-design/icons';
import { Avatar, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminTable, col } from '@/foundation/table';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import type { OrderItemView, OrderTotalsView } from '../model/order.mapper';
import { OrderInfoCard } from './order-info-card';

const ORDER_ITEM_COLUMNS: ColumnsType<OrderItemView> = [
  {
    title: 'Sản phẩm',
    key: 'product',
    render: (_, item) => (
      <div className="flex items-center gap-3">
        <Avatar
          shape="square"
          size={46}
          src={item.imageUrl}
          className="rounded-lg bg-slate-100 flex-shrink-0 text-slate-600 font-bold border border-slate-200"
        >
          {item.initial}
        </Avatar>
        <div className="min-w-0">
          <span className="font-medium text-slate-800 text-xs block truncate">{item.productName}</span>
          <div className="text-[11px] text-slate-400 font-mono">{item.variantLabel}</div>
          {item.flashSale && (
            <Tag color="volcano" className="mt-1">
              Giá flash sale
            </Tag>
          )}
        </div>
      </div>
    ),
  },
  col.number<OrderItemView>('quantity', 'SL', {
    width: 60,
    align: 'center',
    className: 'font-semibold text-slate-700 tabular-nums',
  }),
  col.money<OrderItemView>('unitPrice', 'Đơn giá', { width: 120 }),
  col.money<OrderItemView>('lineTotal', 'Thành tiền', { width: 130, className: 'font-semibold text-slate-800' }),
];

function TotalLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      {children}
    </div>
  );
}

interface OrderItemsCardProps {
  items: OrderItemView[];
  totals: OrderTotalsView;
}

export function OrderItemsCard({ items, totals }: OrderItemsCardProps) {
  return (
    <>
      <OrderInfoCard icon={<ShoppingOutlined />} title={`Danh sách sản phẩm (${items.length})`}>
        <AdminTable rowKey="id" size="small" pagination={false} dataSource={items} columns={ORDER_ITEM_COLUMNS} />
      </OrderInfoCard>

      <div className="ml-auto w-full max-w-sm rounded-xl bg-white p-4 border border-slate-200 shadow-xs space-y-2 text-xs">
        <TotalLine label="Tạm tính tiền hàng">
          <CurrencyAmount amount={totals.subtotal} />
        </TotalLine>
        {totals.discountTotal && (
          <TotalLine label="Giảm giá">
            <span>
              -<CurrencyAmount amount={totals.discountTotal} />
            </span>
          </TotalLine>
        )}
        <TotalLine label="Phí vận chuyển">
          <CurrencyAmount amount={totals.shippingTotal} />
        </TotalLine>
        {totals.taxTotal && (
          <TotalLine label="Thuế GTGT (VAT)">
            <CurrencyAmount amount={totals.taxTotal} />
          </TotalLine>
        )}
        <div className="border-t border-dashed border-slate-200 pt-2.5 flex justify-between items-baseline">
          <span className="text-sm font-bold text-slate-900">Tổng thanh toán</span>
          <span className="text-base font-extrabold text-emerald-600">
            <CurrencyAmount amount={totals.grandTotal} />
          </span>
        </div>
        {totals.pricesIncludeTax && (
          <div className="text-right text-[10px] text-slate-400">Đã bao gồm thuế GTGT (VAT)</div>
        )}
      </div>
    </>
  );
}
