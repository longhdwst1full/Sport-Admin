import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Drawer, Popconfirm } from 'antd';
import { ClearOutlined, WalletOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePosOrder } from '@/generated/api/orders/orders';
import { getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getListInventoryBalancesQueryKey } from '@/generated/api/inventory/inventory';
import {
  PosPaymentMethod,
  type OrderDetailDto,
  type PosCatalogItemDto,
} from '@/generated/api/orders/orders.schemas';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { PosCartTable } from './pos-cart-table';
import type { PosCheckoutValues } from '../model/pos-checkout';
import { PosCounterHeader } from './pos-counter-header';
import { PosCustomerPanel } from './pos-customer-panel';
import { PosPaymentPanel } from './pos-payment-panel';
import { PosProductPicker } from './pos-product-picker';
import { PosReceiptModal } from './pos-receipt-modal';
import { moneyFormatter } from '../constants/pos.constants';
import {
  type PosCartLine,
  addLine,
  cartQuantity,
  cartTotal,
  dropFlashPrice,
  linesOverStock,
  linesWithoutPrice,
  removeLine,
  setQuantity,
  toOrderItems,
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
  paymentMethod: PosPaymentMethod.CASH,
  note: '',
  deliveryMode: 'PICKUP',
  delivery: EMPTY_DELIVERY,
  handOverImmediately: false,
  cashReceived: null,
};

/**
 * Mã lỗi Backend trả khi suất flash hết giữa lúc lập đơn. Phiên bán đã bị dọn và không có đơn nào
 * được tạo, nên màn hình chỉ cần cập nhật giá rồi để nhân viên xác nhận lại.
 */
const POS_FLASH_SALE_REPRICED = 'POS_FLASH_SALE_REPRICED';

function isRepriced(error: unknown): boolean {
  return getApiErrorPayload(error)?.code === POS_FLASH_SALE_REPRICED;
}

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
      /**
       * Suất flash hết đúng lúc đang lập đơn: Backend đã dọn phiên bán và KHÔNG tạo đơn.
       *
       * Cập nhật giá dòng về giá gốc rồi bắt nhân viên bấm lại, thay vì tự gửi lại ngay — con số
       * nhân viên vừa đọc cho khách đã đổi, khách phải được nghe lại trước khi trả tiền. Khoá
       * chống trùng phải đổi theo, vì lần gửi lại là một giao dịch khác.
       */
      onError: (error) => {
        const payload = getApiErrorPayload(error);
        if (payload?.code !== POS_FLASH_SALE_REPRICED) return;
        const affected = (payload.details ?? []).flatMap((detail) =>
          detail.field ? [detail.field] : [],
        );
        setLines((current) => dropFlashPrice(current, affected));
        setIdempotencyKey(crypto.randomUUID());
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
        width="min(1080px, 96vw)"
        destroyOnHidden
        title="Tạo đơn hàng tại cửa hàng"
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
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Tổng thanh toán · {quantity} sản phẩm
              </span>
              <div className="text-2xl font-black text-emerald-700">
                {moneyFormatter.format(total)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="large" disabled={mutation.isPending} onClick={closeDrawer}>
                Hủy
              </Button>
              <Button
                size="large"
                type="primary"
                icon={<WalletOutlined />}
                loading={mutation.isPending}
                disabled={Boolean(blockedReason)}
                onClick={submit}
              >
                Tạo & hoàn tất đơn
              </Button>
            </div>
          </div>
        }
      >
        <PosCounterHeader
          branchId={checkout.branchId}
          disabled={mutation.isPending}
          onChange={(branchId) => {
            // Đổi chi nhánh là đổi kho: tồn và giá vừa hiển thị không còn đúng nữa, giữ lại giỏ cũ
            // sẽ cho nhân viên bán thứ kho mới không có.
            if (branchId !== checkout.branchId) setLines([]);
            setCheckout((current) => ({ ...current, branchId }));
          }}
        />

        {mutation.isError && (
          <Alert
            className="mb-4"
            type={isRepriced(mutation.error) ? 'warning' : 'error'}
            showIcon
            message={
              isRepriced(mutation.error)
                ? 'Giá đã đổi — chưa tạo đơn'
                : 'Không tạo được đơn tại quầy'
            }
            description={getApiErrorMessage(
              mutation.error,
              'Kiểm tra lại tồn kho, giá sản phẩm và quyền bán hàng của tài khoản.',
            )}
          />
        )}

        <Card size="small" title="Khách hàng" className="mb-4">
          <PosCustomerPanel
            values={checkout}
            disabled={mutation.isPending}
            onChange={(patch) => setCheckout((current) => ({ ...current, ...patch }))}
          />
        </Card>

        <Card size="small" title="Sản phẩm" className="mb-4">
          <PosProductPicker
            pickedIds={pickedIds}
            branchId={checkout.branchId}
            onPick={(item: PosCatalogItemDto) => setLines((current) => addLine(current, item))}
          />
          <div className="mt-4">
            <PosCartTable
              lines={lines}
              disabled={mutation.isPending}
              onQuantityChange={(variantId, nextQuantity) =>
                setLines((current) => setQuantity(current, variantId, nextQuantity))
              }
              onRemove={(variantId) => setLines((current) => removeLine(current, variantId))}
            />
          </div>
        </Card>

        <Card size="small" title="Thanh toán">
          <PosPaymentPanel
            total={total}
            method={checkout.paymentMethod}
            isDelivery={checkout.deliveryMode === 'DELIVERY'}
            handOverImmediately={checkout.handOverImmediately}
            cashReceived={checkout.cashReceived}
            disabled={mutation.isPending}
            onChange={(patch) => setCheckout((current) => ({ ...current, ...patch }))}
          />
          <Alert
            className="mt-3"
            type="info"
            showIcon
            message={
              checkout.deliveryMode === 'PICKUP'
                ? 'Đơn tại quầy được ghi nhận đã thanh toán và đã giao; tồn kho trừ ngay khi bán.'
                : 'Đơn giao hàng giữ chỗ tồn kho như đơn của khách; kho xử lý theo luồng thường.'
            }
          />
          {blockedReason && (
            <Alert className="mt-3" type="warning" showIcon message={blockedReason} />
          )}
        </Card>
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
