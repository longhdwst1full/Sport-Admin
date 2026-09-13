# Admin document versioning

> **Rule version:** 2.2.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Bổ sung rule feature-anatomy, shared-module, core-infrastructure, react-hooks và openapi-spec-management (kế thừa `admin-client`, `dragon-web-v2`, `dragonx-employer-web`).

Áp dụng cho `_features/`, `_plans/`, `_prompts/`, Storybook notes và tài liệu Admin. Markdown viết tay phải có version, ngày, change summary và revision history khi được cập nhật có ý nghĩa.

Không chỉnh tay `contracts/` hoặc `src/generated/api` để thêm metadata. Contract version thuộc OpenAPI producer; thay đổi consumer được mô tả trong feature/plan tương ứng.

## Revision history

| Version | Date | Change summary | Source / Change ID |
| --- | --- | --- | --- |
| 2.2.0 | 2026-09-13 | Thêm `13-feature-anatomy.md`, `14-shared-module.md`, `15-core-infrastructure.md`, `16-react-hooks.md`, `19-openapi-spec-management.md`. | `_plans/refactor-base-v1.md` Phase 1 |
| 2.1.0 | 2026-09-13 | Thêm `RULE_INDEX.md`, `02a-contract-change-workflow.md`, `09-data-transformation.md`, `12-skeleton-loading.md`, `99-rule-maintenance.md`. | Kế thừa `dragonx-employer-web/.agent/rules`, `admin-client/.claude/rules` |
| 2.0.0 | 2026-09-05 | Tách rule riêng cho Admin. | Repository tooling split |
