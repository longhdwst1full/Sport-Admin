import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import {
  cancelAdminOrder,
  completeAdminOrder,
  confirmAdminOrder,
  getGetAdminOrderQueryKey,
  getListAdminOrdersQueryKey,
} from '@/generated/api/orders/orders';
import type { OrderDetailDto } from '@/generated/api/orders/orders.schemas';
import {
  getGetAdminFulfillmentByOrderQueryKey,
  getListAdminFulfillmentsQueryKey,
} from '@/generated/api/fulfillments/fulfillments';
import { getListAdminPaymentsQueryKey } from '@/generated/api/payments/payments';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { orderActionCopy } from '../constants/order.constants';
import type { OrderAction } from '../model/order-actions.policy';

interface OrderActionCommand {
  order: Pick<OrderDetailDto, 'id' | 'version'>;
  action: OrderAction;
  reason: string;
}

/**
 * Lệnh chuyển trạng thái đơn (xác nhận/huỷ/hoàn tất) kèm state modal lý do. Modal chỉ đóng khi
 * mutation thành công; lỗi giữ nguyên lý do để người dùng sửa và gửi lại.
 */
export function useOrderAction(order: OrderDetailDto | undefined) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<OrderAction>();
  const [reason, setReason] = useState('');
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);

  const resetState = () => {
    idempotencyRef.current = undefined;
    setAction(undefined);
    setReason('');
  };

  const mutation = useMutation({
    mutationFn: ({ order: target, action: kind, reason: rawReason }: OrderActionCommand) => {
      const normalizedReason = rawReason.trim();
      // CONCURRENCY: cùng lệnh + cùng version + cùng lý do thì dùng lại Idempotency-Key để API trả kết quả cũ.
      const signature = `${kind}:${target.id}:${target.version}:${normalizedReason}`;
      idempotencyRef.current = nextIdempotencyKey(idempotencyRef.current, signature);
      const request = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      const expectedVersion = target.version;
      if (kind === 'cancel') return cancelAdminOrder(target.id, { expectedVersion, reason: normalizedReason }, request);
      if (kind === 'confirm') return confirmAdminOrder(target.id, { expectedVersion, note: normalizedReason }, request);
      return completeAdminOrder(target.id, { expectedVersion, reason: normalizedReason }, request);
    },
    retry: false,
    onSuccess: async (updated, { action: kind }) => {
      queryClient.setQueryData(getGetAdminOrderQueryKey(updated.id), updated);
      // CACHE: xác nhận/huỷ đơn đổi luôn tab danh sách, phiếu giao vận (vận đơn GHN, trạng thái đơn mà
      // bước lấy hàng kiểm tra) và thanh toán.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminFulfillmentByOrderQueryKey(updated.id) }),
        queryClient.invalidateQueries({ queryKey: getListAdminFulfillmentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() }),
      ]);
      resetState();
      void message.success(orderActionCopy[kind].successMessage);
    },
    onError: (error, { order: target }) => {
      // CONCURRENCY: 409 (version cũ / trạng thái đã đổi) → tải lại chi tiết để nút và expectedVersion
      // phản ánh bản mới; gửi lại cùng version chắc chắn lại 409.
      if (getApiErrorPayload(error)?.statusCode === 409) {
        void queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(target.id) });
      }
      void message.error(getApiErrorMessage(error, 'Không thực hiện được thao tác đơn hàng.'));
    },
  });

  return {
    action,
    reason,
    pending: mutation.isPending,
    setReason,
    open: setAction,
    close: () => {
      if (mutation.isPending) return;
      mutation.reset();
      resetState();
    },
    submit: () => {
      if (order && action) mutation.mutate({ order, action, reason });
    },
  };
}
