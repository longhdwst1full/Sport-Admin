import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveAdminReturn,
  cancelAdminReturn,
  closeAdminReturn,
  confirmAdminReturnRefund,
  failAdminReturnRefund,
  getGetAdminReturnQueryKey,
  getGetAdminReturnQueueSummaryQueryKey,
  getListAdminReturnsQueryKey,
  receiveAdminReturn,
  rejectAdminReturn,
  requestAdminReturnRefund,
} from '@/generated/api/returns/returns';
import type {
  ApproveReturnDto,
  ConfirmRefundDto,
  CreateRefundDto,
  InspectReturnDto,
  ReturnCommandDto,
  ReturnDetailDto,
  ReturnReasonCommandDto,
} from '@/generated/api/returns/returns.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { RETURN_VERSION_CONFLICT } from '../constants/return.constants';
import { nextIdempotencyKey } from '../model/return-actions.policy';

export type ReturnCommand =
  | { action: 'approve'; body: ApproveReturnDto }
  | { action: 'reject'; body: ReturnReasonCommandDto }
  | { action: 'cancel'; body: ReturnReasonCommandDto }
  | { action: 'receive'; body: InspectReturnDto }
  | { action: 'close'; body: ReturnCommandDto }
  | { action: 'requestRefund'; body: CreateRefundDto }
  | { action: 'confirmRefund'; refundId: string; body: ConfirmRefundDto }
  | { action: 'failRefund'; refundId: string; body: ReturnReasonCommandDto };

/**
 * Chạy một lệnh chuyển trạng thái trên phiếu trả.
 *
 * CONCURRENCY: body luôn mang `expectedVersion` của lần tải gần nhất; API trả 409
 * `RETURN_VERSION_CONFLICT` nếu người khác vừa thao tác, khi đó tải lại chi tiết để người dùng thấy
 * trạng thái mới thay vì bấm lại vào dữ liệu cũ.
 */
export function useReturnCommand(returnId: string | undefined) {
  const queryClient = useQueryClient();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);

  const mutation = useMutation<ReturnDetailDto, unknown, ReturnCommand>({
    retry: false,
    mutationFn: (command) => {
      if (!returnId) throw new Error('Chưa tải được phiếu trả');
      idempotencyRef.current = nextIdempotencyKey(
        idempotencyRef.current,
        JSON.stringify({ returnId, ...command }),
      );
      const options = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      switch (command.action) {
        case 'approve': return approveAdminReturn(returnId, command.body, options);
        case 'reject': return rejectAdminReturn(returnId, command.body, options);
        case 'cancel': return cancelAdminReturn(returnId, command.body, options);
        case 'receive': return receiveAdminReturn(returnId, command.body, options);
        case 'close': return closeAdminReturn(returnId, command.body, options);
        case 'requestRefund': return requestAdminReturnRefund(returnId, command.body, options);
        case 'confirmRefund': return confirmAdminReturnRefund(returnId, command.refundId, command.body, options);
        case 'failRefund': return failAdminReturnRefund(returnId, command.refundId, command.body, options);
      }
    },
    onSuccess: async (updated) => {
      idempotencyRef.current = undefined;
      // CACHE: chi tiết lấy luôn từ response; danh sách và ô đếm hàng đợi đổi theo trạng thái nên phải
      // invalidate. Nhận hàng còn đổi tồn kho, nhưng màn tồn kho tự tải lại khi mở nên không ép ở đây.
      queryClient.setQueryData(getGetAdminReturnQueryKey(updated.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminReturnsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminReturnQueueSummaryQueryKey() }),
      ]);
    },
    onError: async (error) => {
      if (getApiErrorPayload(error)?.code === RETURN_VERSION_CONFLICT && returnId) {
        idempotencyRef.current = undefined;
        await queryClient.invalidateQueries({ queryKey: getGetAdminReturnQueryKey(returnId) });
      }
    },
  });

  return mutation;
}
