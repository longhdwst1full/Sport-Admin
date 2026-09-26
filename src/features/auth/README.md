# Auth — maintenance note

> **Document version:** 1.3.0
>
> **Last updated:** 2026-09-26
>
> **Change summary:** Ổn định refresh token: khoá xoay giữa các tab, retry với token mới hơn, chỉ đăng xuất khi refresh bị từ chối (401), thử lại 409 một lần và hẹn giờ xoay chủ động luôn được đặt lại.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Trang đăng nhập, trang đổi mật khẩu | Phiên/permission context — thuộc `src/core/auth` |
| | Xoay token trên 401 — thuộc `src/lib/api` |

## Generated operation

`useLoginAdmin`, `useChangeAdminPassword` — `src/generated/api/auth`.

## Token

`AuthService` (`src/core/storage/auth`) là nơi duy nhất giữ token ở BODY mode. **Không** dùng `localStorage` (`15-core-infrastructure.md` RULE-CORE-04), theo đúng `admin-client` và `dragon-web-v2`.

`VITE_AUTH_TOKEN_TRANSPORT=COOKIE` ⇒ server sở hữu refresh token trong HttpOnly cookie; client chỉ giữ access token trong memory để gắn Bearer header. Reload trang dùng refresh cookie lấy access token mới. Production cookie là `SameSite=None; Secure` vì Admin và API khác hostname.

Login gửi `LoginDto.rememberMe`: `false` tạo refresh cookie theo phiên trình duyệt, `true` tạo cookie có `Max-Age` theo `JWT_REFRESH_TTL_SECONDS`. Backend giữ lựa chọn này khi refresh token rotation; Admin không tự lưu refresh token ở COOKIE mode.

### Xoay token (`src/lib/api/fetcher.ts` → `rotateTokens`)

- Request thường trả 401: nếu token hiện tại khác token request đã dùng (tab này/tab khác vừa xoay) ⇒ gửi lại với token hiện tại, **không** refresh. Ngược lại mới xoay; N request cùng 401 dùng chung một `refreshPromise` ⇒ đúng một lời gọi `/refresh` trong tab.
- Giữa các tab: refresh chạy trong Web Lock `dctd-admin-auth-refresh` (`navigator.locks`; trình duyệt không hỗ trợ thì chỉ còn single-flight trong tab). BODY mode đọc lại cookie trong lock — tab khác đã xoay thì dùng luôn token đó; refresh token được đọc ngay trước khi gửi. COOKIE mode mỗi tab vẫn tự gọi (access token ở memory riêng), lúc có lock thì HttpOnly cookie đã là bản mới. Xoay xong phát `BroadcastChannel('dctd-admin-auth')` để tab khác đồng bộ token và đặt lại hẹn giờ.
- Kết quả refresh:
  - 401 (`AUTH_REFRESH_INVALID`, `AUTH_REFRESH_REUSED`, `AUTH_REFRESH_MISSING`, `UNAUTHORIZED` cũ) ⇒ xoá token/cache, redirect `/login`, LoginPage hiển thị đúng một toast “Phiên đăng nhập đã hết hạn”.
  - 409 `AUTH_REFRESH_CONFLICT` ⇒ chờ 300 ms, thử lại đúng một lần.
  - Mất mạng / 429 / 5xx ⇒ **giữ phiên**, request gốc bị reject với lỗi refresh.
- Request thử lại sau khi có token mới trả lỗi khác 401 ⇒ trả đúng lỗi đó. Vẫn 401 sau khi vừa xoay thành công ⇒ coi là phiên bị từ chối và đăng xuất.
- Mã lỗi và tên lock/channel nằm ở `src/core/auth/auth-refresh.constants.ts`.
- Hẹn giờ xoay chủ động (`auth-context.tsx`) phụ thuộc `tokenVersion` của `auth-token.store`, nên được đặt lại sau mỗi lần lưu token. Token BODY dựng lại từ cookie sau reload có `expiresIn = 0` ⇒ lấy mốc từ claim `exp` của JWT (chỉ để hẹn giờ, không xác minh).

`sessionStorage` chỉ giữ cờ flash một lần, không giữ token.

Đổi mật khẩu bắt buộc khi `mustChangePassword = true` trong `TokenPairDto`.

## Checklist khi sửa

- [ ] Không thêm nơi lưu token thứ hai; cập nhật `core/storage/auth/auth-service.test.ts` khi đổi.
- [ ] Lỗi đăng nhập là kết quả nghiệp vụ, không auto-retry.
- [ ] Không log token hay đưa vào URL.
- [ ] Mọi đường xoay token đi qua `rotateTokens`; không gọi `/refresh` trực tiếp. Cập nhật `src/lib/api/fetcher.test.ts` khi đổi luồng 401/refresh.
- [ ] Chỉ refresh bị từ chối mới đăng xuất; không mở rộng sang lỗi mạng/5xx.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.3.0 | 2026-09-26 | Web Lock + BroadcastChannel giữa các tab, retry với token mới hơn, phân loại lỗi refresh (401 đăng xuất, 409 thử lại, mạng/5xx giữ phiên), hẹn giờ xoay luôn đặt lại. |
| 1.2.0 | 2026-09-21 | Gửi `rememberMe` qua generated LoginDto và giao quyền quản lý persistence cho Backend COOKIE transport. |
| 1.1.0 | 2026-09-19 | Sửa khôi phục COOKIE session và auto logout/toast khi refresh thất bại. |
| 1.0.0 | 2026-09-13 | Tạo note cùng đợt chuyển token sang cookie. |
