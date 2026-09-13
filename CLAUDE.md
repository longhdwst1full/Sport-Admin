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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Sport-Admin** (2999 symbols, 4957 relationships, 183 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/Sport-Admin/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Sport-Admin/clusters` | All functional areas |
| `gitnexus://repo/Sport-Admin/processes` | All execution flows |
| `gitnexus://repo/Sport-Admin/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
