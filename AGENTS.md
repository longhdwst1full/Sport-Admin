# Admin application instructions

Scope: this Admin repository only. Do not load Storefront PWA rules or backend implementation rules for ordinary Admin work.

## Stack and boundaries

- React 19, Vite, React Router, Ant Design, Tailwind, TanStack Query, Axios and Redux Toolkit/Saga.
- TanStack Query owns server state; Redux owns cross-route UI/workflow state. React Hook Form/Yup own complex form state and validation.
- Recharts, react-window and CKEditor are feature-level dependencies and must stay lazy or route-scoped.
- Organize business UI under `src/features/<feature>`; application composition lives in `src/app`; reusable infrastructure lives in `src/core` or `src/lib`.
- Consume the API only through `src/generated/api` and the transport mutator. Never import code from `client/` or `api/src`.
- Add dependencies from this repository with `yarn add <package>` (or `--dev`); keep this app independently deployable.

## Required routing

- Read `.agent/rules/RULE_INDEX.md` first; it maps each task type to the exact rules to load.
- Unfamiliar code, architecture search or impact analysis: read `.agent/skills/admin-codebase-navigation/SKILL.md` first.
- New/changed admin feature: read `.agent/skills/admin-feature-development/SKILL.md`.
- API integration or SDK regeneration: read `.agent/skills/admin-api-integration/SKILL.md`.
- Review/handoff: read `.agent/skills/admin-quality-review/SKILL.md`.
- Apply all relevant files in `.agent/rules/`; these rules are local to admin.

## Quality gate

Run from the Admin repository root:

```bash
yarn lint
yarn test
yarn generate:api
yarn build
yarn build-storybook
```

Never manually edit `src/generated/api`.
Run SDK generation when the OpenAPI contract changes; ordinary UI-only changes do not require regeneration.

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
