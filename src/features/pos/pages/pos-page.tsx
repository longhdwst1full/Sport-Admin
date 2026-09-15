import { useMemo, useState } from 'react';
import { ClearOutlined, ShoppingCartOutlined, ShopOutlined, TagsOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Popconfirm } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePosOrder } from '@/generated/api/orders/orders';
import { getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getListInventoryBalancesQueryKey } from '@/generated/api/inventory/inventory';
import {
  CreatePosOrderDtoPaymentMethod,
  type OrderDetailDto,
  type PosCatalogItemDto,
} from '@/generated/api/orders/models';
import { ManagementPage } from '@/foundation/management';
import { PageTransition } from '@/foundation/layout/page-transition';
import { getApiErrorMessage } from '@/lib/api/error';
import { PosCartTable } from '../components/pos-cart-table';
import { PosCheckoutPanel, type PosCheckoutValues } from '../components/pos-checkout-panel';
import { PosProductPicker } from '../components/pos-product-picker';
import { PosReceiptModal } from '../components/pos-receipt-modal';
import { moneyFormatter } from '../constants/pos.constants';
import {
  addLine,
  cartQuantity,
  cartTotal,
  linesOverStock,
  linesWithoutPrice,
  removeLine,
  setQuantity,
  toOrderItems,
  type PosCartLine,
} from '../model/pos-cart';

const EMPTY_CHECKOUT: PosCheckoutValues = {
  branchId: undefined,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  paymentMethod: CreatePosOrderDtoPaymentMethod.CASH,
  note: '',
};

export function PosPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [checkout, setCheckout] = useState<PosCheckoutValues>(EMPTY_CHECKOUT);
  const [receipt, setReceipt] = useState<OrderDetailDto>();
  // Khoá chống trùng đổi theo từng đơn: bấm hai lần cho cùng một đơn thì Backend trả
  // lại đúng đơn đó, còn đơn kế tiếp phải là một giao dịch mới.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const pickedIds = useMemo(
    () => new Set(lines.map((line) => line.variantId)),
    [lines],
  );
  const total = cartTotal(lines);
  const quantity = cartQuantity(lines);
  const unpriced = linesWithoutPrice(lines);
  const overStock = linesOverStock(lines);

  const mutation = useCreatePosOrder({
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
    mutation: {
      onSuccess: async (order) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
        ]);
        setReceipt(order);
        void message.success(`Đã bán xong đơn ${order.orderNo}.`);
      },
    },
  });

  const blockedReason = (() => {
    if (lines.length === 0) return 'Chưa chọn sản phẩm nào.';
    if (unpriced.length > 0) {
      return `Bỏ sản phẩm chưa có giá ra khỏi đơn: ${unpriced.map((line) => line.sku).join(', ')}.`;
    }
    if (overStock.length > 0) {
      return `Vượt tồn khả dụng: ${overStock
        .map((line) => `${line.sku} còn ${line.availableQuantity}`)
        .join(', ')}.`;
    }
    if (!checkout.branchId) return 'Chọn chi nhánh đang đứng quầy.';
    if (!checkout.customerName.trim()) return 'Nhập tên khách hàng.';
    if (!checkout.customerPhone.trim()) return 'Nhập số điện thoại khách hàng.';
    return undefined;
  })();

  const resetCounter = () => {
    setLines([]);
    setCheckout(EMPTY_CHECKOUT);
    setIdempotencyKey(crypto.randomUUID());
  };

  const submit = () => {
    if (blockedReason) return;
    mutation.mutate({
      data: {
        customer: {
          name: checkout.customerName.trim(),
          phone: checkout.customerPhone.trim(),
          email: checkout.customerEmail.trim() || undefined,
        },
        items: toOrderItems(lines),
        paymentMethod: checkout.paymentMethod,
        note: checkout.note.trim() || undefined,
        branchId: checkout.branchId,
      },
    });
  };

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Vận hành bán hàng"
        title="Bán tại quầy"
        description="Lập đơn cho khách mua trực tiếp tại cửa hàng: chọn hàng, thu tiền và giao ngay tại chỗ."
        dataNotice="Đơn tạo ở đây được ghi nhận đã thanh toán và đã giao; tồn kho trừ ngay khi bán."
        metrics={[
          {
            key: 'lines',
            label: 'Mặt hàng trong đơn',
            value: lines.length,
            icon: <TagsOutlined />,
            tone: 'blue',
          },
          {
            key: 'quantity',
            label: 'Tổng số lượng',
            value: quantity,
            icon: <ShoppingCartOutlined />,
            tone: 'orange',
          },
          {
            key: 'total',
            label: 'Tổng tiền tạm tính',
            value: moneyFormatter.format(total),
            icon: <ShopOutlined />,
            tone: 'green',
            hint: 'Giá đã bao gồm VAT',
          },
        ]}
        actions={
          <Popconfirm
            title="Xoá toàn bộ đơn đang lập?"
            okText="Xoá"
            cancelText="Giữ lại"
            disabled={lines.length === 0 && checkout.customerName === ''}
            onConfirm={resetCounter}
          >
            <Button icon={<ClearOutlined />} disabled={lines.length === 0}>
              Huỷ đơn đang lập
            </Button>
          </Popconfirm>
        }
      >
        {mutation.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tạo được đơn tại quầy"
            description={getApiErrorMessage(
              mutation.error,
              'Kiểm tra lại tồn kho, giá sản phẩm và quyền bán hàng của tài khoản.',
            )}
          />
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(320px,0.9fr)]">
          <Card title="Chọn sản phẩm" className="h-[640px] overflow-hidden" styles={{ body: { height: 'calc(100% - 56px)' } }}>
            <PosProductPicker
              pickedIds={pickedIds}
              branchId={checkout.branchId}
              onPick={(item: PosCatalogItemDto) => setLines((current) => addLine(current, item))}
            />
          </Card>

          <Card title="Đơn đang lập" className="h-[640px] overflow-auto">
            <PosCartTable
              lines={lines}
              disabled={mutation.isPending}
              onQuantityChange={(variantId, nextQuantity) =>
                setLines((current) => setQuantity(current, variantId, nextQuantity))
              }
              onRemove={(variantId) => setLines((current) => removeLine(current, variantId))}
            />
          </Card>

          <Card title="Thu tiền" className="h-[640px] overflow-auto">
            <PosCheckoutPanel
              values={checkout}
              total={total}
              quantity={quantity}
              submitting={mutation.isPending}
              blockedReason={blockedReason}
              onChange={(patch) => {
                // Đổi chi nhánh là đổi kho: tồn và giá vừa hiển thị không còn đúng nữa,
                // giữ lại giỏ cũ sẽ cho nhân viên bán thứ kho mới không có.
                if (patch.branchId && patch.branchId !== checkout.branchId) setLines([]);
                setCheckout((current) => ({ ...current, ...patch }));
              }}
              onSubmit={submit}
            />
          </Card>
        </div>
      </ManagementPage>

      <PosReceiptModal
        order={receipt}
        onClose={() => setReceipt(undefined)}
        onNewOrder={() => {
          setReceipt(undefined);
          resetCounter();
        }}
      />
    </PageTransition>
  );
}
