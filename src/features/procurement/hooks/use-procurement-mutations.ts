import { App } from 'antd';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage, isStaleWriteError, STALE_WRITE_RELOADED_MESSAGE } from '@/lib/api/error';
import { nextIdempotencyKey } from '@/shared/utils/idempotency';

interface DocumentQueryKeys {
  /** Tiền tố query key của danh sách (không truyền params để khớp mọi trang/lọc). */
  list: QueryKey;
  detail: (id: string) => QueryKey;
}

/**
 * Chạy một lệnh chuyển trạng thái chứng từ (duyệt, ghi sổ, huỷ…) từ drawer chi tiết.
 *
 * CACHE: thành công thì invalidate list + detail của chứng từ.
 * CONCURRENCY: 409 VERSION_STALE/CONCURRENT_UPDATE → tải lại chi tiết để thao tác tiếp trên version mới.
 * Lỗi được ném lại để hộp xác nhận giữ nguyên (người dùng thử lại hoặc huỷ).
 */
export function useDocumentCommand(keys: DocumentQueryKeys) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const refresh = (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.list }),
      queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    ]);

  return async (id: string, task: () => Promise<unknown>, successText: string) => {
    try {
      await task();
    } catch (error) {
      if (isStaleWriteError(error)) {
        void refresh(id);
        void message.warning(STALE_WRITE_RELOADED_MESSAGE);
      } else void message.error(getApiErrorMessage(error));
      throw error;
    }
    await refresh(id);
    void message.success(successText);
  };
}

interface SaveInput<TPayload> {
  payload: TPayload;
  /** Có thì sửa bản nháp (gửi `expectedVersion`); không thì tạo mới kèm `Idempotency-Key`. */
  update?: { id: string; run: (payload: TPayload) => Promise<unknown> };
  create: (payload: TPayload, options: { headers: Record<string, string> }) => Promise<unknown>;
  successText: string;
  errorText: string;
  onDone: () => void;
}

/**
 * Lưu nháp PO/phiếu nhập/phiếu trả: khoá idempotency giữ theo chữ ký payload để bấm lại sau lỗi mạng
 * không tạo trùng chứng từ; invalidate list (+ detail khi sửa). `resetKey` gọi mỗi lần mở form.
 */
export function useDocumentSave(keys: DocumentQueryKeys) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const keyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const save = async <TPayload,>({ payload, update, create, successText, errorText, onDone }: SaveInput<TPayload>) => {
    setSubmitting(true);
    try {
      if (update) await update.run(payload);
      else {
        keyRef.current = nextIdempotencyKey(keyRef.current, JSON.stringify(payload));
        await create(payload, { headers: { 'Idempotency-Key': keyRef.current.key } });
      }
      keyRef.current = undefined;
      await queryClient.invalidateQueries({ queryKey: keys.list });
      if (update) await queryClient.invalidateQueries({ queryKey: keys.detail(update.id) });
      void message.success(successText);
      onDone();
    } catch (error) {
      void message.error(getApiErrorMessage(error, errorText));
    } finally {
      setSubmitting(false);
    }
  };

  const resetKey = useCallback(() => {
    keyRef.current = undefined;
  }, []);

  return { save, submitting, resetKey };
}
