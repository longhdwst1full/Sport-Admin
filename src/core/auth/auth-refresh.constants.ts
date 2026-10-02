/**
 * Mã lỗi và khoá điều phối của luồng xoay token Admin.
 *
 * CONTRACT: Các mã lấy từ error contract của `POST /admin/auth/refresh` (Backend). OpenAPI hiện
 * chưa xuất enum mã lỗi, nên đây là nơi DUY NHẤT Admin khai báo chúng — không rải literal ở
 * fetcher/test. Khi contract có enum, thay bằng giá trị sinh từ `src/generated/api`.
 */
export const AuthRefreshErrorCode = {
  /** Refresh token sai, hết hạn hoặc phiên đã bị thu hồi. */
  INVALID: 'AUTH_REFRESH_INVALID',
  /** Refresh token đã bị dùng (reuse detection): Backend thu hồi cả family. */
  REUSED: 'AUTH_REFRESH_REUSED',
  /** Không gửi refresh token/cookie. */
  MISSING: 'AUTH_REFRESH_MISSING',
  /** Một lần xoay khác của cùng phiên đang chạy; tạm thời, được phép thử lại. */
  CONFLICT: 'AUTH_REFRESH_CONFLICT',
  /**
   * Phiên bị thu hồi vì 2FA vừa thành bắt buộc mà tài khoản chưa bật: kết luận, đăng xuất một lần
   * và đưa về đăng nhập để thiết lập 2FA.
   */
  MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  /** Mã 401 chung của Backend trước khi có các mã riêng ở trên. */
  LEGACY_UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type AuthRefreshErrorCode = (typeof AuthRefreshErrorCode)[keyof typeof AuthRefreshErrorCode];

/** Các mã có nghĩa là phiên không còn cứu được: chỉ những mã này mới được đăng xuất người dùng. */
export const TERMINAL_REFRESH_ERROR_CODES: ReadonlySet<string> = new Set([
  AuthRefreshErrorCode.INVALID,
  AuthRefreshErrorCode.REUSED,
  AuthRefreshErrorCode.MISSING,
  AuthRefreshErrorCode.MFA_REQUIRED,
  AuthRefreshErrorCode.LEGACY_UNAUTHORIZED,
]);

/** Tên Web Lock dùng chung giữa các tab để chỉ một tab gọi `/refresh` tại một thời điểm. */
export const AUTH_REFRESH_LOCK_NAME = 'dctd-admin-auth-refresh';

/** Kênh BroadcastChannel báo cho tab khác biết token vừa được xoay. */
export const AUTH_BROADCAST_CHANNEL = 'dctd-admin-auth';

export const AuthBroadcastMessage = {
  TOKENS_ROTATED: 'tokens-rotated',
  TOKENS_REQUESTED: 'tokens-requested',
} as const;

/** Chờ tab đang giữ access token trả lời trước khi tự xoay refresh cookie thêm lần nữa. */
export const AUTH_PEER_TOKEN_WAIT_MS = 120;

/** Chờ trước khi thử lại một lần khi Backend trả `AUTH_REFRESH_CONFLICT`. */
export const REFRESH_CONFLICT_RETRY_DELAY_MS = 300;
