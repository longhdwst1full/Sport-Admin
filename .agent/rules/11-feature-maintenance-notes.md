# Feature maintenance notes

- Feature có nhiều page/component, workflow, permission hoặc lifecycle phải có `src/features/<feature>/README.md`.
- README ghi phạm vi/out-of-scope, public entry, generated operation, permission, state ownership và checklist khi sửa.
- Comment/JSDoc chỉ giải thích quyết định khó: mapping, permission/state gate, cache invalidation, concurrency hoặc workaround có điều kiện gỡ bỏ. Không comment lại JSX/cú pháp hiển nhiên.
- Khi behavior/contract/permission thay đổi, cập nhật note trong cùng task và tăng document version theo rule Admin.
- Không thêm comment vào `contracts/` hoặc `src/generated/api`; sửa OpenAPI producer, sync và regenerate.
