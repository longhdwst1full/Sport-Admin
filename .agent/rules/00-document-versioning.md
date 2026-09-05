# Admin document versioning

> **Rule version:** 2.0.0
>
> **Last updated:** 2026-09-05
>
> **Change summary:** Tách rule về Admin repository và loại quy định DB không thuộc frontend.

Áp dụng cho `_features/`, `_plans/`, `_prompts/`, Storybook notes và tài liệu Admin. Markdown viết tay phải có version, ngày, change summary và revision history khi được cập nhật có ý nghĩa.

Không chỉnh tay `contracts/` hoặc `src/generated/api` để thêm metadata. Contract version thuộc OpenAPI producer; thay đổi consumer được mô tả trong feature/plan tương ứng.

## Revision history

| Version | Date | Change summary | Source / Change ID |
| --- | --- | --- | --- |
| 2.0.0 | 2026-09-05 | Tách rule riêng cho Admin. | Repository tooling split |
