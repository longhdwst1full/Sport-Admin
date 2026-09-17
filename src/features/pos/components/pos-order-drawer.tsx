import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Drawer, Popconfirm } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePosOrder } from '@/generated/api/orders/orders';
import { getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getListInventoryBalancesQueryKey } from '@/generated/api/inventory/inventory';
import {
  CreatePosOrderDtoPaymentMethod,
  type OrderDetailDto,
  type PosCatalogItemDto,
} from '@/generated/api/orders/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { PosCartTable } from './pos-cart-table';
import { PosCheckoutPanel, type PosCheckoutValues } from './pos-checkout-panel';
import { PosProductPicker } from './pos-product-picker';
import { PosReceiptModal } from './pos-receipt-modal';
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

const EMPTY_DELIVERY = {
  recipient: '',
  phone: '',
  addressLine: '',
  province: '',
  provinceCode: '',
  district: '',
  districtCode: '',
  ward: '',
  wardCode: '',
};

const EMPTY_CHECKOUT: PosCheckoutValues = {
  branchId: undefined,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  paymentMethod: CreatePosOrderDtoPaymentMethod.CASH,
  note: '',
  deliveryMode: 'PICKUP',
  delivery: EMPTY_DELIVERY,
  handOverImmediately: false,
};

/**
 * Lập đơn bán trực tiếp ngay trong màn Đơn hàng.
 *
 * Trước đây đây là một màn riêng trong menu. Gộp vào Đơn hàng vì nhân viên lập đơn và tra đơn là
 * cùng một người, cùng một lúc — tách hai mục menu bắt họ nhảy qua lại.
 */
export function PosOrderDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [checkout, setCheckout] = useState<PosCheckoutValues>(EMPTY_CHECKOUT);
  const [receipt, setReceipt] = useState<OrderDetailDto>();
  // Khoá chống trùng đổi theo từng đơn: bấm hai lần cho cùng một đơn thì Backend trả
  // lại đúng đơn đó, còn đơn kế tiếp phải là một giao dịch mới.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const pickedIds = useMemo(() => new Set(lines.map((line) => line.variantId)), [lines]);
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
    if (checkout.deliveryMode === 'DELIVERY') {
      const { recipient, phone, addressLine, provinceCode, districtCode, wardCode } =
        checkout.delivery;
      if (!recipient.trim() || !phone.trim()) return 'Nhập người nhận và số điện thoại giao hàng.';
      // Mã địa giới là thứ hãng vận chuyển dùng để định tuyến; thiếu thì không tạo được vận đơn.
      if (!provinceCode || !districtCode || !wardCode) {
        return 'Chọn đủ tỉnh/thành, quận/huyện và phường/xã.';
      }
      if (!addressLine.trim()) return 'Nhập địa chỉ chi tiết.';
    }
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
        ...(checkout.deliveryMode === 'DELIVERY'
          ? {
              delivery: {
                recipient: checkout.delivery.recipient.trim(),
                phone: checkout.delivery.phone.trim(),
                addressLine: checkout.delivery.addressLine.trim(),
                province: checkout.delivery.province,
                provinceCode: checkout.delivery.provinceCode,
                district: checkout.delivery.district,
                districtCode: checkout.delivery.districtCode,
                ward: checkout.delivery.ward,
                wardCode: checkout.delivery.wardCode,
              },
              handOverImmediately: checkout.handOverImmediately,
            }
          : {}),
      },
    });
  };

  const closeDrawer = () => {
    if (mutation.isPending) return;
    resetCounter();
    onClose();
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={closeDrawer}
        width="min(1400px, 96vw)"
        destroyOnHidden
        title="Tạo đơn"
        extra={
          <Popconfirm
            title="Xoá toàn bộ đơn đang lập?"
            okText="Xoá"
            cancelText="Giữ lại"
            disabled={lines.length === 0}
            onConfirm={resetCounter}
          >
            <Button icon={<ClearOutlined />} disabled={lines.length === 0}>
              Làm lại
            </Button>
          </Popconfirm>
        }
      >
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message={
            checkout.deliveryMode === 'PICKUP'
              ? 'Đơn tại quầy được ghi nhận đã thanh toán và đã giao; tồn kho trừ ngay khi bán.'
              : 'Đơn giao hàng giữ chỗ tồn kho như đơn của khách; kho xử lý theo luồng thường.'
          }
        />
        {mutation.isError && (
          <Alert
            className="mb-4"
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
          <Card
            title="Chọn sản phẩm"
            className="h-[620px] overflow-hidden"
            styles={{ body: { height: 'calc(100% - 56px)' } }}
          >
            <PosProductPicker
              pickedIds={pickedIds}
              branchId={checkout.branchId}
              onPick={(item: PosCatalogItemDto) => setLines((current) => addLine(current, item))}
            />
          </Card>

          <Card title="Đơn đang lập" className="h-[620px] overflow-auto">
            <PosCartTable
              lines={lines}
              disabled={mutation.isPending}
              onQuantityChange={(variantId, nextQuantity) =>
                setLines((current) => setQuantity(current, variantId, nextQuantity))
              }
              onRemove={(variantId) => setLines((current) => removeLine(current, variantId))}
            />
          </Card>

          <Card title="Khách hàng & thu tiền" className="h-[620px] overflow-auto">
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
      </Drawer>

      <PosReceiptModal
        order={receipt}
        onClose={() => setReceipt(undefined)}
        onNewOrder={() => {
          setReceipt(undefined);
          resetCounter();
        }}
      />
    </>
  );
}
