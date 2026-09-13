# Refactor base FE (client + admin) V1

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Phase 1–3 đã hoàn thành (gate xanh cả 2 repo); Phase 4 chờ contract BE. Kế hoạch base lại `dctd-utc/client` và `dctd-utc/admin` kế thừa có kiểm soát từ `admin-client`, `dragon-web-v2`, `dragonx-employer-web`; chuẩn hoá rule/skill và khoá quy trình BE-first cho contract.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi |
| --- | --- |
| Cấu trúc thư mục `client/src`, `admin/src` | Thay đổi nghiệp vụ, đổi UI/UX |
| Bộ rule `.agent/rules` + mirror `.claude/rules` của cả 2 repo | Viết lại `api/` NestJS (chỉ liệt kê task BE) |
| Gom hook/util/store dùng chung | Sửa tay `src/generated/api`, `contracts/` (tuyệt đối cấm) |
| Ghi nhận gap contract kèm evidence | Tự chế DTO/endpoint để lấp gap |

## Nguồn kế thừa

| Source | Lấy gì | Không lấy gì |
| --- | --- | --- |
| `admin-client` | Anatomy feature `components/constants/hooks/pages/slice/types/utils/index.ts`; tầng `access/` RBAC; `foundation/{import,export}` | Quy mô 120 feature, i18n, cấu trúc `core/sources` theo domain tài chính |
| `dragon-web-v2` | `core/{http,storage,sources}`, `shared/{builder,cache,config,constants,enums,hooks,utils}`, rule foundation/hooks/image/shared-config | Global client-store flow cho route public Next.js (`10-reference-adoption.md`) |
| `dragonx-employer-web` | Rule `05b-openapi-spec-management`, `17-list-page-pattern`, ý tưởng tầng `business/` | Tách `business/` thành tầng riêng ở client (dùng `shared/` + feature) |
| `saletools` | **Không kế thừa.** README là boilerplate GitLab, stack Relay/GraphQL không tương thích REST+OpenAPI của dctd | — |

---

## Phase 1 — Rule & skill parity

Mục tiêu: mọi refactor sau đó có luật để chiếu. Rule adapt (5–15 dòng, 1 concern, có ✅/❌), **không copy nguyên bản** rule 200–400 dòng của reference (`10-reference-adoption.md`).

### Checklist

- [x] `13-foundation-components.md` — khi nào thêm vào `foundation/` vs `features/`
- [x] `14-shared-module.md` — tiêu chí "thực sự trung lập" để được vào `shared/`
- [x] `15-core-infrastructure.md` — `core/` sở hữu http/storage/session, feature không tự đọc `localStorage`
- [x] `16-react-hooks.md` — quy tắc hook: đặt tên, deps, không hook trong điều kiện, hook dùng chung ở đâu
- [x] `17-image-usage.md` — `next/image` bắt buộc, aspect-ratio, alt (client); Antd/img (admin)
- [x] `18-list-page-pattern.md` — filter/paging/empty/skeleton chuẩn cho list page
- [x] `19-openapi-spec-management.md` — sync/diff/verify contract, không drift
- [x] Bump `00-document-versioning.md` cả 2 repo
- [x] Mirror byte-identical `.agent/rules/` → `.claude/rules/` (`99-rule-maintenance.md`)
- [x] Cập nhật `RULE_INDEX.md` cả 2 repo

**Gate:** `diff -r .agent/rules .claude/rules` rỗng.

---

## Phase 2 — Base lại `dctd/admin`

Hiện trạng lệch chuẩn nặng nhất: `orders/`, `payments/` đúng anatomy nhưng `products/` là 11 file phẳng, `auth/` 2 file phẳng; thiếu `shared/`, `widgets/`, `access/`; `core/` chỉ có `auth/`.

### Checklist

- [x] `features/products/` → `components/ constants/ model/ pages/ index.ts`
      (11 file: `products-page.tsx` → `pages/`; `*-drawer.tsx`, `*-panel.tsx` → `components/`; `*.policy.ts`, `*.mapper.ts` + test → `model/`)
- [x] `features/auth/` → `pages/{login-page,change-password-page}.tsx` + `index.ts`
- [x] `features/shared/module-placeholder-page.tsx` → `features/_placeholder/pages/` hoặc `foundation/feedback/`
- [x] Tạo `src/shared/{hooks,constants,utils,types}` + `index.ts`; chuyển util dùng chung từ `lib/utils`
- [~] `src/access/` — **bỏ**, không tạo: `src/core/auth` (`permissions.tsx`, `permission-route.tsx`) đã giữ vai trò này; thêm tầng nữa là trùng lặp (`13-feature-anatomy.md` cấm thư mục rỗng/wrapper)
- [x] Mở rộng `src/core/` thêm `http/`, `storage/`
- [x] Mỗi feature có `index.ts`; route chỉ import qua barrel (cấm deep import)
- [ ] README cho feature đủ lớn (`11-feature-maintenance-notes.md`) — còn thiếu ở `products`, `inventory`, `access`

**Gate:** `yarn lint && yarn test && yarn build` xanh; 0 deep import `@/features/*/`.

---

## Phase 3 — Base lại `dctd/client`

### Checklist

- [x] Dựng `src/core/storage/` — gom 3 token store rải rác:
      `features/auth/model/auth-token.store.ts`, `features/cart/model/guest-cart-token.store.ts`,
      `features/orders/model/guest-order-access.store.ts` → adapter chung, feature giữ key riêng
- [~] `core/http/` — **bỏ**, không chuyển: giữ `src/lib/api/fetcher.ts` cho khớp Admin và tránh phải đổi `orval.config.ts` + regenerate toàn bộ SDK. Rule `15-core-infrastructure.md` đã sửa lời văn cho khớp
- [x] Mở rộng `src/shared/{hooks,constants,utils}` + `index.ts`
- [x] Giải tán `src/components/`:
      `address/vietnam-address-selector.tsx` → `features/checkout/components/` hoặc `shared/components/address/`;
      `pwa-registration.tsx` → `src/pwa/`; `3d/` → `foundation/` hoặc xoá nếu không dùng
- [x] Tất cả feature có `index.ts`, route chỉ import barrel ✅ (đã xong)
- [x] Anatomy feature thống nhất `api|components|hooks|model|pages|index.ts`
- [x] `src/constants/` → `src/shared/constants/`
- [x] `vitest.config.ts` thêm alias `@` (test không resolve được barrel mới)

**Gate:** `yarn verify` xanh; First Load JS `/` không tăng so với mốc hiện tại (363 kB).

---

## Phase 4 — Contract & gỡ mock (BE-first)

Nguyên tắc bất di dịch (`02a-contract-change-workflow.md`): NestJS decorator → `openapi.json` → `document/api/storefront/*.yaml` → `yarn contracts:sync` → `yarn generate:api` → feature. **FE không tự chế endpoint/DTO.**

### Task BE bắt buộc (có evidence)

| # | Endpoint Storefront cần | Evidence thiếu | FE unblock |
| --- | --- | --- | --- |
| BE-1 | `GET /catalog/categories` (public) | Chỉ có `admin/catalog/categories` permission-gated — `api/src/modules/catalog/master-data/catalog-master.controller.ts:132` | `category-list-page`, `category-visual-showcase` |
| BE-2 | `GET /catalog/products` hỗ trợ `q`/search | `Storefront Catalog` chỉ 2 operation — `contracts/storefront/catalog.yaml` | `search-page` |
| BE-3 | `POST /catalog/products/:slug/reviews` | `review.controller.ts:28` storefront chỉ `@Get()` | Viết đánh giá |
| BE-4 | `GET /promotions/*` | `api/src/modules/promotion/` chỉ có `promotion.module.ts`, 0 controller | `flash-sale` |
| BE-5 | `GET /customer/notifications` | `api/src/modules/notification/` chỉ có module file | `header-notifications` |
| BE-6 | `POST /returns` | `api/src/modules/return/` chỉ có module file | Đổi trả / bảo hành |

### Checklist FE (chỉ chạy sau khi BE có contract)

- [ ] Gỡ mock theo thứ tự: `category-showcase` → `product-catalog` → `news` → `product-reviews` → `flash-sale` → `notifications` → `profile`
- [ ] Nối SDK `cart` thật: `useCreateGuestCart`, `useSetGuestCartItem`, `useUpdateGuestCartItem`, `useRemoveGuestCartItem` hiện **0 lần dùng**; Redux cart chỉ giữ vai trò local UI state
- [ ] Quyết định `quoteShipping` (generated, 0 dùng): nối hoặc ghi lý do vào `features/checkout/README.md` (`RULE-CTR-06`)
- [ ] Xem lại địa giới VN: đang gọi third-party `shared/services/vietnam-address.service.ts` — giữ (có chủ đích) hay chuyển về API nội bộ
- [ ] Điều tra First Load JS `/` = 363 kB vs mốc 149 kB trong `06-quality.md`

---

## Rủi ro

| Rủi ro | Giảm thiểu |
| --- | --- |
| Move file làm gãy import diện rộng | `git mv` + `yarn lint` sau mỗi bước; không gộp nhiều phase trong 1 commit |
| Refactor che mất regression runtime | Bắt buộc `yarn build` (App Router/SW lỗi không hiện ở dev — `06-quality.md`) |
| Kế thừa quá tay từ Vite SPA reference | Route public giữ server-first; Redux chỉ cho state tương tác (`01-next-rendering.md`) |
| Gỡ mock trước khi có contract | Mock chỉ được gỡ khi symbol tồn tại trong `src/generated/api` (`RULE-CTR-03`) |

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.1.0 | 2026-09-13 | Hoàn thành Phase 1–3; ghi nhận 2 hạng mục chủ động bỏ (`access/`, `core/http`). | Refactor execution |
| 1.0.0 | 2026-09-13 | Chốt plan 4 phase base lại client + admin. | Workspace reference review |
