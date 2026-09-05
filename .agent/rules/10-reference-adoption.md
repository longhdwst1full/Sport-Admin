# Admin reference adoption

Use `admin-client` for operational CRUD conventions: separate active-search endpoints, server pagination/filter/sort, table-to-drawer flow, edit hydration, field-level backend errors, permission-driven actions and Redux Saga only for cross-route workflows.

Use `dragonx-employer-web` for foundation selection, feature composition, tokens, skeleton parity, lazy heavy dependencies and Storybook coverage. Map these patterns to the existing `src/app`, `src/foundation`, `src/features`, `src/core` and `src/lib`; do not create a second architecture.

Generated OpenAPI hooks remain the only API boundary. Every management feature needs list/detail/create/update/lifecycle states appropriate to its contract; “screen renders” is not equivalent to CRUD completion.
