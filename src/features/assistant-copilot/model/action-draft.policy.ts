import { ACTION_DRAFT_ASK_AGAIN_CODES, COPILOT_PERMISSION } from '../constants/copilot.constants';
import type { ActionDraftStatus, StockAdjustmentDraft } from './copilot.types';

/**
 * Trạng thái hiển thị: bản nháp PENDING đã quá `expiresAt` coi như EXPIRED ngay trên UI (không đợi tải lại),
 * vì API đánh dấu EXPIRED lười khi đọc/xác nhận và chắc chắn từ chối sau hạn.
 */
export function effectiveDraftStatus(
  draft: Pick<StockAdjustmentDraft, 'status' | 'expiresAt'>,
  now: number,
): ActionDraftStatus {
  if (draft.status === 'PENDING' && Date.parse(draft.expiresAt) <= now) return 'EXPIRED';
  return draft.status;
}

export interface ActionDraftAffordances {
  status: ActionDraftStatus;
  canConfirm: boolean;
  canReject: boolean;
  /** Lý do khoá nút Xác nhận khi bản nháp còn chờ. */
  confirmBlockedReason?: string;
  /** Gợi ý hỏi lại trợ lý để lập bản nháp mới (tồn đã đổi, preview lệch, hoặc hết hạn). */
  offerAskAgain: boolean;
}

/**
 * PERMISSION: chỉ là affordance. Xác nhận chạy điều chỉnh tồn bằng principal của người bấm nên cần
 * `inventory.stock.adjust`; API vẫn kiểm quyền, phạm vi kho/chi nhánh, hạn, version và payloadHash.
 * Từ chối không đổi tồn nên chỉ cần `assistant.use` (drawer đã chặn).
 */
export function actionDraftAffordances(
  draft: StockAdjustmentDraft,
  permissions: ReadonlySet<string>,
  now: number,
): ActionDraftAffordances {
  const status = effectiveDraftStatus(draft, now);
  const pending = status === 'PENDING';
  let confirmBlockedReason: string | undefined;
  if (pending && !permissions.has(COPILOT_PERMISSION.STOCK_ADJUST)) {
    confirmBlockedReason = 'Bạn cần quyền điều chỉnh tồn kho để xác nhận bản nháp này.';
  } else if (pending && !draft.consistent) {
    confirmBlockedReason = 'Số liệu bản nháp không khớp (chênh lệch khác tồn yêu cầu − tồn hiện tại). Hãy hỏi lại trợ lý.';
  }
  return {
    status,
    canConfirm: pending && !confirmBlockedReason,
    canReject: pending,
    confirmBlockedReason,
    offerAskAgain:
      status === 'EXPIRED' ||
      (pending && !draft.consistent) ||
      (status === 'FAILED' && Boolean(draft.errorCode && ACTION_DRAFT_ASK_AGAIN_CODES.has(draft.errorCode))),
  };
}

/** "+5" / "-3" / "0" — dấu luôn hiện để không nhầm tăng/giảm. */
export function formatQuantityDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Thời gian còn lại dạng `mm:ss` (hoặc `h:mm:ss` khi ≥ 1 giờ); hết hạn trả `undefined`. */
export function formatRemaining(remainingMs: number): string | undefined {
  if (remainingMs <= 0) return undefined;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Câu hỏi gửi lại trợ lý để lập bản nháp mới theo tồn hiện tại. */
export function askAgainPrompt(draft: Pick<StockAdjustmentDraft, 'sku' | 'warehouseCode' | 'requestedOnHand' | 'reason'>): string {
  return `Tồn kho đã thay đổi. Hãy kiểm tra lại tồn hiện tại của SKU ${draft.sku} tại kho ${draft.warehouseCode} và lập lại bản nháp điều chỉnh về ${draft.requestedOnHand} (lý do: ${draft.reason}).`;
}
