import { useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Card, Drawer, Popconfirm } from 'antd';
import { ClearOutlined, WalletOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { createPosOrder, useCreatePosOrder } from '@/generated/api/orders/orders';
import { getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getListInventoryBalancesQueryKey } from '@/generated/api/inventory/inventory';
import {
  PosPaymentMethod,
  type CreatePosOrderDto,
  type OrderDetailDto,
  type PosCatalogItemDto,
} from '@/generated/api/orders/orders.schemas';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { PosCartTable } from './pos-cart-table';
import { type PosCheckoutValues, validatePosCheckout } from '../model/pos-checkout';
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
import { DRAWER_WIDTH } from '@/foundation/overlay';

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

/**
 * Mã lỗi chống phát lại của Backend. Gặp một trong hai thì lượt gửi hiện tại không dùng lại được nữa:
 * lần bấm kế tiếp phải là một lượt mới (key + timestamp mới).
 */
const POS_ATTEMPT_RESET_CODES = new Set(['REQUEST_TIMESTAMP_OUT_OF_WINDOW', 'IDEMPOTENCY_PAYLOAD_MISMATCH']);

/**
 * Một lượt gửi đơn: key (nonce) và timestamp sinh lúc bấm lần đầu, giữ nguyên khi bấm lại cùng nội dung
 * để Backend trả lại đúng đơn cũ; nội dung đổi thì là đơn khác, phải sinh lượt mới.
 */
interface PosSubmitAttempt {
  key: string;
  timestamp: string;
  fingerprint: string;
}

function isRepriced(error: unknown): boolean {
  return getApiErrorPayload(error)?.code === POS_FLASH_SALE_REPRICED;
}

/**
 * Lập đơn bán trực tiếp ngay trong màn Đơn hàng.
 *
 * Trước đây đây là một màn riêng trong menu. Gộp vào Đơn hàng vì nhân viên lập đơn và tra đơn là
 * cùng một người, cùng một lúc — tách hai mục menu bắt họ nhảy qua lại.
 */
export function PosOrderDrawer({
  open,
  onClose,
  onCreated,
  onNewOrder,
}: {
  open: boolean;
  onClose: () => void;
  /** Gọi sau khi tạo đơn thành công, lúc drawer đã đóng, để trang đưa danh sách về chỗ thấy đơn mới. */
  onCreated?: (order: OrderDetailDto) => void;
  /** "Bán đơn tiếp theo" trên biên lai: drawer đã đóng nên trang phải mở lại. */
  onNewOrder?: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [checkout, setCheckout] = useState<PosCheckoutValues>(EMPTY_CHECKOUT);
  const [receipt, setReceipt] = useState<OrderDetailDto>();
  // Lỗi từng ô chỉ hiện sau lần bấm tạo đầu tiên, để phiếu trống không đỏ ngay khi vừa mở.
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  // Khoá chống trùng đổi theo từng đơn: bấm hai lần cho cùng một đơn thì Backend trả
  // lại đúng đơn đó, còn đơn kế tiếp phải là một giao dịch mới. Giữ trong ref để header
  // của đúng lần bấm này được đọc lúc gửi, không phải giá trị của lần render trước.
  const attemptRef = useRef<PosSubmitAttempt | null>(null);

  const pickedIds = useMemo(() => new Set(lines.map((line) => line.variantId)), [lines]);
  const total = cartTotal(lines);
  const quantity = cartQuantity(lines);
  const unpriced = linesWithoutPrice(lines);
  const overStock = linesOverStock(lines);

  const mutation = useCreatePosOrder({
    mutation: {
      mutationFn: ({ data }) => {
        const attempt = attemptRef.current;
        if (!attempt) throw new Error('Thiếu lượt gửi đơn');
        return createPosOrder(data, {
          headers: { 'Idempotency-Key': attempt.key, 'X-Request-Timestamp': attempt.timestamp },
        });
      },
      onSuccess: async (order) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
        ]);
        setReceipt(order);
        void message.success(`Đã bán xong đơn ${order.orderNo}.`);
        // Đóng phiếu và đưa danh sách đơn về chỗ thấy đơn mới; biên lai nằm ngoài drawer nên vẫn hiện.
        resetCounter();
        onClose();
        onCreated?.(order);
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
        if (payload?.code && POS_ATTEMPT_RESET_CODES.has(payload.code)) {
          attemptRef.current = null;
          return;
        }
        if (payload?.code !== POS_FLASH_SALE_REPRICED) return;
        const affected = (payload.details ?? []).flatMap((detail) =>
          detail.field ? [detail.field] : [],
        );
        setLines((current) => dropFlashPrice(current, affected));
        attemptRef.current = null;
      },
    },
  });

  const fieldErrors = validatePosCheckout(checkout);
  const visibleFieldErrors = showFieldErrors ? fieldErrors : {};

  // Lỗi giỏ hàng không gắn với ô nào nên khoá hẳn nút tạo; lỗi theo ô thì để bấm được và hiện tại ô.
  const cartBlockedReason = (() => {
    if (lines.length === 0) return 'Chưa chọn sản phẩm nào.';
    if (unpriced.length > 0) {
      return `Bỏ sản phẩm chưa có giá ra khỏi đơn: ${unpriced.map((line) => line.sku).join(', ')}.`;
    }
    if (overStock.length > 0) {
      return `Vượt tồn khả dụng: ${overStock
        .map((line) => `${line.sku} còn ${line.availableQuantity}`)
        .join(', ')}.`;
    }
    return undefined;
  })();
  const blockedReason = cartBlockedReason ?? Object.values(fieldErrors)[0];

  const resetCounter = () => {
    setLines([]);
    setCheckout(EMPTY_CHECKOUT);
    setShowFieldErrors(false);
    attemptRef.current = null;
  };

  const submit = () => {
    if (cartBlockedReason) return;
    if (Object.keys(fieldErrors).length > 0) {
      setShowFieldErrors(true);
      return;
    }
    const data = buildOrderData();
    const fingerprint = JSON.stringify(data);
    if (attemptRef.current?.fingerprint !== fingerprint) {
      attemptRef.current = { key: crypto.randomUUID(), timestamp: new Date().toISOString(), fingerprint };
    }
    mutation.mutate({ data });
  };

  const buildOrderData = (): CreatePosOrderDto => ({
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
  });

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
        width={DRAWER_WIDTH.xl}
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
                Huỷ
              </Button>
              <Button
                size="large"
                type="primary"
                icon={<WalletOutlined />}
                loading={mutation.isPending}
                disabled={Boolean(cartBlockedReason)}
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
          error={visibleFieldErrors.branchId}
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
            errors={visibleFieldErrors}
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
          onNewOrder?.();
        }}
      />
    </>
  );
}
