import { Alert, Button } from 'antd';
import { getApiErrorMessage } from '@/lib/api/error';

interface QueryErrorAlertProps {
  error?: unknown;
  retry?: () => void;
  /** Custom error title. Overrides the default "Không thể tải dữ liệu". */
  message?: string;
  /** Custom error description. Overrides the auto-generated API error message. */
  description?: string;
  /** Alias for `retry` — used by callers that prefer `onRetry`. */
  onRetry?: () => void;
}

export function QueryErrorAlert({
  error,
  retry,
  message: title,
  description: desc,
  onRetry,
}: QueryErrorAlertProps) {
  const retryFn = retry ?? onRetry;
  return (
    <Alert
      type="error"
      showIcon
      className="!mb-5 !rounded-xl"
      message={title ?? 'Không thể tải dữ liệu'}
      description={
        desc ??
        getApiErrorMessage(
          error,
          'Kết nối hoặc dịch vụ đang có lỗi. Vui lòng thử lại.',
        )
      }
      action={
        retryFn ? (
          <Button className="!rounded-lg" onClick={retryFn}>
            Thử lại
          </Button>
        ) : undefined
      }
    />
  );
}
