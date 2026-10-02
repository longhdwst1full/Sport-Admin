import { ApiError } from './fetcher';

interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

interface ApiErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ApiErrorPayload>;
  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  );
}

export function getApiErrorPayload(error: unknown): ApiErrorPayload | undefined {
  return error instanceof ApiError && isApiErrorPayload(error.payload) ? error.payload : undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
): string {
  const payload = getApiErrorPayload(error);
  if (!payload) return error instanceof Error && error.message ? error.message : fallback;
  return payload.message;
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  const details = getApiErrorPayload(error)?.details ?? [];
  return Object.fromEntries(
    details
      .filter((detail): detail is ApiErrorDetail & { field: string } => Boolean(detail.field))
      .map((detail) => [detail.field, detail.message]),
  );
}

/** Thông báo chung khi chứng từ đã bị người khác đổi và UI vừa tải lại bản mới. */
export const STALE_WRITE_RELOADED_MESSAGE = 'Dữ liệu đã thay đổi, đã tải lại';

/**
 * 409 do ghi trên bản cũ (`*_VERSION_STALE`) hoặc xung đột đồng thời (`*_CONCURRENT_UPDATE`).
 * Caller nên refetch chi tiết thay vì chỉ báo lỗi, vì thử lại với cùng version chắc chắn lại 409.
 */
export function isStaleWriteError(error: unknown): boolean {
  const payload = getApiErrorPayload(error);
  return payload?.statusCode === 409 && /(_VERSION_STALE|_CONCURRENT_UPDATE)$/.test(payload.code);
}
