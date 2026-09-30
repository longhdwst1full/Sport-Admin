import { useMemo, useState, type ReactNode } from 'react';
import { CopilotPageContext } from '../hooks/copilot-page-context';
import type { CopilotPageHints } from '../model/copilot.types';

/** Bọc admin shell để trang (trong `Outlet`) và drawer Copilot (ở header) cùng thấy gợi ý ngữ cảnh. */
export function CopilotPageContextProvider({ children }: { children: ReactNode }) {
  const [hints, setHints] = useState<CopilotPageHints>();
  const value = useMemo(() => ({ hints, setHints }), [hints]);
  return <CopilotPageContext.Provider value={value}>{children}</CopilotPageContext.Provider>;
}
