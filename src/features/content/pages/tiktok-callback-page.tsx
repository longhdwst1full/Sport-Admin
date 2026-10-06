import { useQueryClient } from '@tanstack/react-query';
import { App, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  completeAdminTikTokConnect,
  getGetAdminTikTokAccountQueryKey,
  getGetAdminTikTokCreatorInfoQueryKey,
} from '@/generated/api/content/content';
import { safeReturnPath } from '@/core/auth/return-path';
import {
  TIKTOK_CONNECT_DEFAULT_RETURN,
  TIKTOK_CONNECT_RETURN_KEY,
} from '../constants/social.constants';
import { socialCommandErrorMessage } from '../model/social-command-error';

/** Chỉ nhận đường dẫn nội bộ (`safeReturnPath`) để không thành open redirect. */
function takeReturnPath(): string {
  try {
    const stored = sessionStorage.getItem(TIKTOK_CONNECT_RETURN_KEY);
    sessionStorage.removeItem(TIKTOK_CONNECT_RETURN_KEY);
    if (stored) return safeReturnPath(stored, TIKTOK_CONNECT_DEFAULT_RETURN);
  } catch {
    // Storage bị chặn: quay về mặc định.
  }
  return TIKTOK_CONNECT_DEFAULT_RETURN;
}

/**
 * Trang nhận redirect OAuth của TikTok (`TIKTOK_REDIRECT_URI` trỏ vào đây). Đọc `code` + `state` rồi gọi
 * `completeAdminTikTokConnect` đúng MỘT lần (code dùng một lần; React StrictMode chạy effect hai lần nên chặn bằng ref),
 * sau đó quay về trang đã bấm "Kết nối" kèm toast. API kiểm `state` gắn với người bấm — người khác mở link sẽ bị từ chối.
 * Người dùng từ chối ở TikTok → TikTok trả `error` thay cho `code`.
 */
export function TikTokCallbackPage() {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    const state = params.get('state');
    const returnPath = takeReturnPath();

    if (!code || !state) {
      const denied = params.get('error');
      void message.error(
        denied ? 'Đã huỷ kết nối TikTok hoặc TikTok từ chối yêu cầu.' : 'Thiếu mã xác thực từ TikTok. Vui lòng bấm kết nối lại.',
      );
      navigate(returnPath, { replace: true });
      return;
    }

    void completeAdminTikTokConnect({ code, state })
      .then(async (account) => {
        queryClient.setQueryData(getGetAdminTikTokAccountQueryKey(), account);
        await queryClient.invalidateQueries({ queryKey: getGetAdminTikTokCreatorInfoQueryKey() });
        void message.success(
          account.accountName ? `Đã kết nối tài khoản TikTok ${account.accountName}` : 'Đã kết nối tài khoản TikTok',
        );
      })
      .catch((error: unknown) => void message.error(socialCommandErrorMessage(error)))
      .finally(() => navigate(returnPath, { replace: true }));
  }, [params, navigate, message, queryClient]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Spin tip="Đang hoàn tất kết nối TikTok..." size="large">
        <div className="h-16 w-64" />
      </Spin>
    </div>
  );
}
