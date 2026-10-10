import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { applyReferenceDataPolicy } from './reference-data-policy';

/**
 * Áp chính sách cache tham chiếu khi khung admin tải (chunk lazy sau đăng nhập), không ở chunk khởi
 * động: `REFERENCE_DATA` kéo theo key builder của 6 SDK sinh tự động (~30 kB) mà /login không cần.
 * Áp trong lazy initializer — chạy lúc render, trước khi trang con tạo query đầu tiên.
 */
export function ReferenceDataPolicyGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useState(() => applyReferenceDataPolicy(queryClient));
  return children;
}
