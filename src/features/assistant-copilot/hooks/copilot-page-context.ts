import { createContext, useContext, useEffect } from 'react';
import type { CopilotPageHints } from '../model/copilot.types';

export interface CopilotPageContextValue {
  hints: CopilotPageHints | undefined;
  setHints: (hints: CopilotPageHints | undefined) => void;
}

export const CopilotPageContext = createContext<CopilotPageContextValue>({
  hints: undefined,
  setHints: () => undefined,
});

/** Gợi ý của trang đang mở, đọc bởi drawer Copilot. */
export function useCopilotPageContext(): CopilotPageHints | undefined {
  return useContext(CopilotPageContext).hints;
}

/**
 * Trang công bố thực thể đang xem (đơn/SKU/kho) để Copilot gửi kèm làm gợi ý; gỡ khi trang/drawer đóng.
 *
 * CONTRACT: route Admin không đưa id lên URL (đơn, tồn kho mở chi tiết bằng state cục bộ), nên trang phải
 * tự công bố. SECURITY: đây chỉ là gợi ý cho trợ lý; tool vẫn chạy bằng quyền và phạm vi của nhân viên.
 */
export function useCopilotPageHints(hints: CopilotPageHints | undefined): void {
  const { setHints } = useContext(CopilotPageContext);
  const orderId = hints?.orderId;
  const sku = hints?.sku;
  const warehouseCode = hints?.warehouseCode;
  useEffect(() => {
    if (!orderId && !sku && !warehouseCode) return undefined;
    setHints({ orderId, sku, warehouseCode });
    return () => setHints(undefined);
  }, [orderId, sku, warehouseCode, setHints]);
}
