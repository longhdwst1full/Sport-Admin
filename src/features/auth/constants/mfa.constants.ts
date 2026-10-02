/** Header mang mã TOTP hiện tại của người thao tác cho thao tác nhạy cảm (khớp `MFA_CODE_HEADER` phía API). */
export const MFA_CODE_HEADER = 'x-mfa-code';

/** Google Authenticator sinh mã 6 chữ số. */
export const MFA_CODE_LENGTH = 6;

export const MFA_CODE_PATTERN = /^\d{6}$/;

/** Số lần nhập sai (mật khẩu + OTP + x-mfa-code dùng chung bộ đếm) trước khi API khoá tài khoản. */
export const MFA_MAX_FAILED_ATTEMPTS = 5;

/** Mã lỗi ổn định API trả cho luồng 2FA. */
export const MFA_ERROR_CODE = {
  CHALLENGE_INVALID: 'MFA_CHALLENGE_INVALID',
  CODE_INVALID: 'MFA_CODE_INVALID',
  CODE_REQUIRED: 'MFA_CODE_REQUIRED',
  NOT_ENROLLED: 'MFA_NOT_ENROLLED',
  ALREADY_ENROLLED: 'MFA_ALREADY_ENROLLED',
  ENROLLMENT_NOT_STARTED: 'MFA_ENROLLMENT_NOT_STARTED',
  SECRET_UNREADABLE: 'MFA_SECRET_UNREADABLE',
  TARGET_NOT_STAFF: 'MFA_TARGET_NOT_STAFF',
  CODE_ALREADY_USED: 'MFA_CODE_ALREADY_USED',
  EXEMPT_ACCOUNT: 'MFA_EXEMPT_ACCOUNT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
} as const;

export type MfaErrorCode = (typeof MFA_ERROR_CODE)[keyof typeof MFA_ERROR_CODE];

/**
 * Thông báo tiếng Việt theo mã lỗi. API đã trả message tiếng Việt; bảng này giữ thông báo ổn định
 * khi message phía server đổi câu chữ hoặc lỗi đến từ proxy không có message.
 */
export const MFA_ERROR_MESSAGES: Record<MfaErrorCode, string> = {
  MFA_CHALLENGE_INVALID: 'Phiên xác thực 2 lớp đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
  MFA_CODE_INVALID: 'Mã xác thực không đúng hoặc đã được sử dụng.',
  MFA_CODE_REQUIRED: 'Thao tác này cần mã xác thực 2 lớp hiện tại của bạn.',
  // 403: người thao tác chưa bật 2FA. 404/409 (thao tác trên nhân viên): xem MFA_TARGET_NOT_ENROLLED_MESSAGE.
  MFA_NOT_ENROLLED: 'Tài khoản của bạn chưa bật xác thực 2 lớp nên không thực hiện được thao tác này.',
  MFA_ALREADY_ENROLLED: 'Tài khoản đã có xác thực 2 lớp. Liên hệ Admin nếu cần cấp lại.',
  MFA_ENROLLMENT_NOT_STARTED: 'Chưa tạo mã QR. Vui lòng bắt đầu lại bước thiết lập xác thực 2 lớp.',
  MFA_SECRET_UNREADABLE: 'Không đọc được khoá xác thực 2 lớp. Vui lòng cấp lại mã QR.',
  MFA_TARGET_NOT_STAFF: 'Chỉ quản lý được xác thực 2 lớp của tài khoản nhân viên.',
  // Không tính là lần nhập sai: mã TOTP dùng một lần, chờ ứng dụng sinh mã mới.
  MFA_CODE_ALREADY_USED: 'Mã này vừa được dùng, chờ mã mới (30 giây).',
  MFA_EXEMPT_ACCOUNT: 'Tài khoản quản trị khẩn cấp không dùng xác thực 2 lớp.',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa do nhập sai 5 lần. Vui lòng liên hệ Admin để mở khóa.',
};

/** MFA_NOT_ENROLLED khi nhân viên được thao tác (không phải người thao tác) chưa có 2FA. */
export const MFA_TARGET_NOT_ENROLLED_MESSAGE = 'Nhân viên này chưa có xác thực 2 lớp. Dùng "Cấp lại QR" để tạo mới.';

/** LoginPage báo khi API thu hồi phiên vì 2FA vừa thành bắt buộc (refresh trả AUTH_MFA_REQUIRED). */
export const MFA_REQUIRED_SESSION_MESSAGE =
  'Hệ thống vừa bắt buộc xác thực 2 lớp. Đăng nhập lại và thiết lập Google Authenticator để tiếp tục.';
