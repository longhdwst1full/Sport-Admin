# Auth — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note khi token chuyển từ `sessionStorage` sang cookie qua `core/storage/AuthService`.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Trang đăng nhập, trang đổi mật khẩu | Phiên/permission context — thuộc `src/core/auth` |
| | Xoay token trên 401 — thuộc `src/lib/api` |

## Generated operation

`useLoginAdmin`, `useChangeAdminPassword` — `src/generated/api/auth`.

## Token

`AuthService` (`src/core/storage/auth`) là nơi duy nhất giữ token: memory trước, cookie `SameSite=Lax` + `Secure` (https) + `Max-Age = expiresIn` làm lớp bền. **Không** dùng `localStorage`/`sessionStorage` (`15-core-infrastructure.md` RULE-CORE-04), theo đúng `admin-client` và `dragon-web-v2`.

`VITE_AUTH_TOKEN_TRANSPORT=COOKIE` ⇒ server sở hữu HttpOnly cookie, client không giữ bản sao.

Đổi mật khẩu bắt buộc khi `mustChangePassword = true` trong `TokenPairDto`.

## Checklist khi sửa

- [ ] Không thêm nơi lưu token thứ hai; cập nhật `core/storage/auth/auth-service.test.ts` khi đổi.
- [ ] Lỗi đăng nhập là kết quả nghiệp vụ, không auto-retry.
- [ ] Không log token hay đưa vào URL.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note cùng đợt chuyển token sang cookie. |
