import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmAdminActionDraft,
  getGetAdminActionDraftQueryKey,
  rejectAdminActionDraft,
  useGetAdminActionDraft,
} from '@/generated/api/assistant/assistant';
import type { AdminActionDraftDto } from '@/generated/api/assistant/assistant.schemas';
import { getApiErrorPayload } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';
import { ACTION_DRAFT_STALE_ERROR_CODES } from '../constants/copilot.constants';
import { toStockAdjustmentDraft } from '../model/copilot.mapper';
import type { StockAdjustmentDraft } from '../model/copilot.types';

/**
 * Trạng thái hiện tại của một bản nháp. Lượt vừa gửi đã ghi DTO vào cache (không tải lại); thẻ trong lịch sử
 * đọc một lần khi hiển thị. `getAdminActionDraft` tự đánh dấu EXPIRED nếu quá hạn.
 */
export function useActionDraft(draftId: string) {
  return useGetAdminActionDraft(draftId, {
    query: { select: toStockAdjustmentDraft, staleTime: Infinity, retry: false },
  });
}

export type ActionDraftCommand = { action: 'confirm' } | { action: 'reject'; reason?: string };

/**
 * Xác nhận / từ chối một bản nháp.
 *
 * CONTRACT: xác nhận trả 200 kèm bản nháp EXECUTED (có `resultRef`) hoặc FAILED (có `errorCode`, vd tồn đã
 * đổi) — lỗi nghiệp vụ không phải HTTP lỗi. HTTP 409/403/404 chỉ cho lỗi lệnh (hết hạn, version, hash, ...).
 *
 * CONCURRENCY: gửi `expectedVersion` của bản đang hiển thị; xác nhận gửi thêm `payloadHash` để API chỉ chạy đúng
 * nội dung người dùng đã đọc. Mã stale (`ACTION_DRAFT_STALE_ERROR_CODES`) → tải lại bản nháp.
 *
 * IDEMPOTENCY: API dùng `draft:<id>` làm khoá xuống Inventory (một bản nháp ghi tối đa một phiếu) và xác nhận
 * lặp khi đã EXECUTED/FAILED trả kết quả cũ. FE vẫn gửi `Idempotency-Key` theo lần bấm (cùng version/hash dùng
 * lại key) cho nhất quán với các lệnh khác.
 */
export function useActionDraftCommand(draft: StockAdjustmentDraft) {
  const queryClient = useQueryClient();
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const key = getGetAdminActionDraftQueryKey(draft.id);

  return useMutation<AdminActionDraftDto, unknown, ActionDraftCommand>({
    retry: false,
    mutationFn: (command) => {
      const expectedVersion = draft.version;
      if (command.action === 'reject') {
        return rejectAdminActionDraft(draft.id, {
          expectedVersion,
          ...(command.reason ? { reason: command.reason } : {}),
        });
      }
      const body = { payloadHash: draft.payloadHash, expectedVersion };
      idempotencyRef.current = nextIdempotencyKey(idempotencyRef.current, JSON.stringify({ draftId: draft.id, ...body }));
      return confirmAdminActionDraft(draft.id, body, { headers: { 'Idempotency-Key': idempotencyRef.current.key } });
    },
    onSuccess: (updated) => {
      idempotencyRef.current = undefined;
      queryClient.setQueryData(key, updated);
    },
    onError: async (error) => {
      const code = getApiErrorPayload(error)?.code;
      if (code && ACTION_DRAFT_STALE_ERROR_CODES.has(code)) {
        idempotencyRef.current = undefined;
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** Đồng hồ cho đếm ngược; chỉ chạy khi `active` để thẻ đã xử lý không re-render mỗi giây. */
export function useNow(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}
