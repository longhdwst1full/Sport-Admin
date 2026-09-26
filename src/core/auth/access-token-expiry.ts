/**
 * Thời điểm nên xoay access token, tính từ `expiresIn` mà server trả về.
 *
 * Xoay **trước** khi hết hạn thay vì đợi một request hỏng với 401 rồi mới xoay: đường xoay phản ứng
 * chỉ chạy khi có request, nên một tab để mở qua đêm sẽ hết hạn lặng lẽ và thao tác đầu tiên sau đó
 * phải thất bại một lần. Nó cũng che mất mọi lỗi cấu hình transport — người dùng chỉ thấy mình bị
 * đăng xuất, không thấy refresh đã không chạy được.
 */

/** Xoay khi còn lại ngần này giây, nhưng không sớm hơn nửa vòng đời token. */
const REFRESH_LEAD_SECONDS = 60;
/** Không hẹn giờ ngắn hơn ngần này để tránh vòng lặp xoay liên tục khi server trả TTL rất nhỏ. */
const MINIMUM_DELAY_SECONDS = 30;

export function refreshDelayMs(expiresInSeconds: number | undefined): number | undefined {
  if (!expiresInSeconds || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    // Server không nói token sống bao lâu (ví dụ phiên khôi phục từ cookie): giữ nguyên hành vi
    // xoay khi gặp 401 thay vì đoán một mốc thời gian.
    return undefined;
  }
  const lead = Math.min(REFRESH_LEAD_SECONDS, expiresInSeconds / 2);
  return Math.max(expiresInSeconds - lead, MINIMUM_DELAY_SECONDS) * 1000;
}

/**
 * Mốc hết hạn (epoch ms) đọc từ claim `exp` của access token JWT, hoặc `undefined`.
 *
 * Cần cho BODY mode sau khi tải lại trang: token được dựng lại từ cookie nên mất `expiresIn`
 * (bằng 0) và hẹn giờ xoay chủ động không đặt được.
 *
 * SECURITY: Chỉ dùng để HẸN GIỜ. Không xác minh chữ ký và không bao giờ dùng kết quả này để
 * quyết định quyền hay tính hợp lệ của phiên — Backend vẫn là nơi kiểm token.
 */
export function jwtExpiresAtMs(token: string | undefined): number | undefined {
  const payload = token?.split('.')[1];
  if (!payload) return undefined;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as {
      exp?: unknown;
    };
    return typeof claims.exp === 'number' && Number.isFinite(claims.exp) ? claims.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}
