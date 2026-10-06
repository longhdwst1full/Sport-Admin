import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseEnum } from '@/shared/utils/parse-enum';

type ParamValue = string | number | null | undefined;

/**
 * Bộ lọc danh sách nằm trên URL: F5, Back và gửi link giữ nguyên lọc/trang. Ghi bằng `replace` để
 * mỗi lần gõ/chọn không tạo một mục lịch sử; giá trị rỗng thì xoá khỏi URL.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();

  const patch = useCallback(
    (values: Record<string, ParamValue>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(values)) {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return {
    get: (key: string) => params.get(key) ?? undefined,
    getEnum: <T extends string>(key: string, values: Record<string, T> | readonly T[]) =>
      parseEnum(values, params.get(key)),
    getNumber: (key: string, fallback: number) => {
      const parsed = Number(params.get(key));
      return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    },
    set: (key: string, value: ParamValue) => patch({ [key]: value }),
    patch,
  };
}
