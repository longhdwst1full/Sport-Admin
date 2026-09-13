# Rule Index — DCTD Admin

> Read this file first. Then read ONLY the rules listed for the task at hand.
> `.agent/rules/` is authoritative; `.claude/rules/` is a mirror.

## Task → rules

### 🧩 New / changed admin feature

| Prio | Rule | Check |
| --- | --- | --- |
| P0 | `00-directory-structure.md` | feature folder, dependency direction |
| P0 | `02-api-contract.md` | consume `src/generated/api` only |
| P0 | `05-list-form-patterns.md` | list query/URL sync, form ↔ DTO mapping |
| P0 | `09-data-transformation.md` | DTO → view model, field → component mapping |
| P1 | `03-antd-tailwind-ui.md` | Ant Design + Tailwind boundaries |
| P1 | `04-permissions-transitions.md` | RBAC gating, state machine transitions |
| P1 | `07-state-tools-performance.md` | Query vs Redux ownership, lazy deps |
| P0 | `13-feature-anatomy.md` | khuôn components/constants/hooks/model/pages + barrel |
| P0 | `15-core-infrastructure.md` | transport/storage/permission qua core |
| P1 | `14-shared-module.md` | thứ gì được vào `shared/` |
| P1 | `16-react-hooks.md` | derive state, effect cho hệ thống ngoài |
| P1 | `12-skeleton-loading.md` | loading states |
| P1 | `11-feature-maintenance-notes.md` | feature README + comments |
| P2 | `06-quality.md` | quality gate |

Skill: `.agent/skills/admin-feature-development/SKILL.md`

### 🔌 API integration / SDK regeneration

| Prio | Rule | Check |
| --- | --- | --- |
| P0 | `02a-contract-change-workflow.md` | direction of change, evidence, no hand-written DTO |
| P0 | `02-api-contract.md` | fetcher boundary, retry policy |
| P1 | `08-enums-constants.md` | enums come from generated DTOs |
| P1 | `09-data-transformation.md` | mapper layer |

Skill: `.agent/skills/admin-api-integration/SKILL.md`
Commands: `yarn contracts:sync` → `yarn generate:api`

### 🧭 Unfamiliar code / impact analysis

Skill: `.agent/skills/admin-codebase-navigation/SKILL.md` + GitNexus (`CLAUDE.md`).

### ✅ Review / handoff

| Prio | Rule |
| --- | --- |
| P0 | `06-quality.md` |
| P0 | `02a-contract-change-workflow.md` (RULE-CTR-03 evidence) |
| P1 | `11-feature-maintenance-notes.md`, `00-document-versioning.md` |

Skill: `.agent/skills/admin-quality-review/SKILL.md`

### 🧩 Found a gap in these rules

`99-rule-maintenance.md` → write to `.agent/.pending-rules/`, never straight into `.agent/rules/`.

## Full list

| File | Scope |
| --- | --- |
| `00-directory-structure.md` | layers and dependency direction |
| `00-document-versioning.md` | handwritten doc versioning |
| `01-routing-layouts.md` | routes, layouts, guards |
| `02-api-contract.md` | generated SDK + transport |
| `02a-contract-change-workflow.md` | BE → contract → SDK → feature |
| `03-antd-tailwind-ui.md` | Ant Design / Tailwind usage |
| `04-permissions-transitions.md` | RBAC and state transitions |
| `05-list-form-patterns.md` | list pages and CRUD forms |
| `06-quality.md` | quality gate |
| `07-state-tools-performance.md` | Query/Redux, heavy deps |
| `08-enums-constants.md` | enums, codes, keys |
| `09-data-transformation.md` | DTO ↔ form ↔ column |
| `10-reference-adoption.md` | reference repo policy |
| `11-feature-maintenance-notes.md` | feature README requirements |
| `12-skeleton-loading.md` | loading states |
| `13-feature-anatomy.md` | khuôn thư mục feature |
| `14-shared-module.md` | shared thực sự trung lập |
| `15-core-infrastructure.md` | core: auth, storage, http |
| `16-react-hooks.md` | quy tắc hook |
| `19-openapi-spec-management.md` | quản lý spec OpenAPI |
| `99-rule-maintenance.md` | how rules themselves change |
