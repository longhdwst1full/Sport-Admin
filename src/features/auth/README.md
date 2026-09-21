# Auth — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-09-21
>
> **Change summary:** Nối checkbox ghi nhớ đăng nhập vào contract Backend và giữ refresh-cookie semantics qua rotation.

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

Khi request thường trả 401, fetcher chỉ refresh một lần dùng chung cho các request đồng thời. Refresh hỏng hoặc không còn credential ⇒ xoá token/cache, redirect `/login` và LoginPage hiển thị đúng một toast “Phiên đăng nhập đã hết hạn”. `sessionStorage` chỉ giữ cờ flash một lần, không giữ token.

Đổi mật khẩu bắt buộc khi `mustChangePassword = true` trong `TokenPairDto`.

## Checklist khi sửa

- [ ] Không thêm nơi lưu token thứ hai; cập nhật `core/storage/auth/auth-service.test.ts` khi đổi.
- [ ] Lỗi đăng nhập là kết quả nghiệp vụ, không auto-retry.
- [ ] Không log token hay đưa vào URL.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.2.0 | 2026-09-21 | Gửi `rememberMe` qua generated LoginDto và giao quyền quản lý persistence cho Backend COOKIE transport. |
| 1.1.0 | 2026-09-19 | Sửa khôi phục COOKIE session và auto logout/toast khi refresh thất bại. |
| 1.0.0 | 2026-09-13 | Tạo note cùng đợt chuyển token sang cookie. |
