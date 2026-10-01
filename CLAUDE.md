# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Admin context

Read `AGENTS.md` and the task-relevant files under `.agent/rules` and `.agent/skills` before changing this repository. Do not import API or Storefront rules.

## Commands

```bash
yarn dev                 # Vite dev server on :5173
yarn build               # tsc -b && vite build
yarn lint                # eslint src/**/*.{ts,tsx}
yarn test                # vitest run --pool=threads
yarn storybook           # Storybook on :6006
yarn verify              # lint + test + generate:api + build + build-storybook

yarn contracts:sync      # pull Admin OpenAPI slices into contracts/admin/*.yaml
yarn generate:api        # clean + regenerate src/generated/api from those contracts
```

Single test: `yarn vitest run src/features/products/product-workflow.policy.test.ts` (add `-t "name"` for one case).
Tests sit next to the code (`*.test.ts[x]`) and concentrate on transport, auth/permissions and feature mappers/policies.

Node >= 22, Yarn 1; deps are added from this repo only (`yarn add <pkg>`).

## Architecture

React 19 + Vite SPA with Ant Design 5 + Tailwind, TanStack Query, Redux Toolkit/Saga and react-router 7.

- **Generated SDK per domain.** `orval.config.ts` builds one isolated client+models folder per admin domain (auth, iam, catalog, inventory, orders, payments, fulfillments, media, content, reviews, organization, checkout, audit, system) from `contracts/admin/<domain>.yaml`. All of `src/generated/api` is disposable output — regenerate, never hand-edit. Mutating state-machine operations (stock adjust/transfer, order confirm/cancel/complete, payment confirm/reject, fulfillment pick/pack/ship/deliver/fail/receive-return) are overridden to `apiFetcherWithOptions` so callers can pass per-request config such as an idempotency key.
- **Transport.** `src/lib/api/fetcher.ts` is the single Orval mutator: base URL from `VITE_API_URL`, `withCredentials`, bearer header from `core/auth/auth-token.store`, one de-duplicated `/api/v1/admin/auth/refresh` rotation on 401, and `ApiError(status, payload)` normalization.
- **Composition.** `src/app` owns the shell: `providers.tsx` stacks Redux → QueryClient (`app/config/query-client`) → AntD `ConfigProvider` (`app/config/theme`) → `AuthProvider` → `PermissionProvider`; `app/router/app-routes.tsx` the route tree, `app/navigation` the menu, `app/store` the Redux slices.
- **State ownership.** TanStack Query owns all server state. Redux holds only admin shell state — `layout.slice.ts` (sidebar + open navigation tabs) persisted/hydrated through `root.saga.ts`. Do not mirror API payloads into Redux.
- **Permissions.** `src/core/auth/permissions.tsx` builds a `ReadonlySet` of permission codes from the current user, with a development-only bypass (`shouldBypassPermissions` + `VITE_DEV_PERMISSIONS`) — this is a dev scaffold, not a security boundary; the API is the authority.
- **Layers.** `src/features/<domain>` owns feature UI/orchestration and API-to-view mapping, `src/layouts` the admin shell, `src/foundation` reusable AntD-based primitives (table, inputs, feedback, export, management), `src/lib` transport/media/validation/utils adapters.

`src/features/README.md` holds the current feature map and per-change checklist.
