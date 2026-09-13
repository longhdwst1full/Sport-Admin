# Admin core infrastructure

`src/core` sở hữu policy xuyên feature: auth/session, storage, http.

## RULE-CORE-01: Feature không đọc `localStorage` trực tiếp (P0)

```ts
// ❌ localStorage.getItem('dctd.admin.token')
// ✅ import { tokenStore } from '@/core/storage';
```

## RULE-CORE-02: Một transport duy nhất (P0)

`src/lib/api` là mutator Orval duy nhất; feature **không** import `axios`. Core/lib không chứa endpoint path hay DTO nghiệp vụ (`02-api-contract.md`).

## RULE-CORE-03: Core không import feature (P0)

Chiều phụ thuộc: `app → layouts → features → foundation/shared → core/lib`.

## RULE-CORE-04: Token nằm ở cookie, không ở web storage (P0)

Theo `admin-client` và `dragon-web-v2` (`core/storage/auth/auth-service.ts`).

```ts
// ❌ sessionStorage/localStorage giữ token: không có hạn, không có SameSite/Secure
window.sessionStorage.setItem('auth', JSON.stringify(tokens));

// ✅ AuthService: memory trước, cookie làm lớp bền
import { AuthService } from '@/core/storage';
AuthService.save(tokens); // Max-Age = expiresIn, SameSite=Lax, Secure trên https
```

`AuthService` là API token duy nhất. Khi `VITE_AUTH_TOKEN_TRANSPORT=COOKIE`, server
sở hữu HttpOnly cookie và client **không** giữ bản sao.

## RULE-CORE-05: Permission là policy của core/access (P0)

Kiểm tra quyền tập trung, map với `@RequirePermissions` phía NestJS (`04-permissions-transitions.md`). Không rải chuỗi permission thô trong JSX.
