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
