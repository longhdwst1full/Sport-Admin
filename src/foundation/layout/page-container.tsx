import type { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-full w-full max-w-[1680px]">{children}</div>;
}
