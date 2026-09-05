# Admin reference policy

Primary references:

- `/home/longhd/Documents/admin-client`: sidebar/header/menu, list/search/pagination, form/drawer, API boundary, saga and operational CRUD conventions.
- `/home/longhd/Documents/Work/dragonx-employer-web`: feature/foundation separation, composition, design tokens, Storybook, skeleton and performance conventions.

Reuse concepts and verified components only when dependencies and behavior match. Do not copy investment-domain models, legacy request clients, environment values, generated API files or credentials. The local `.agent/rules`, `src/foundation`, `src/features`, OpenAPI contract and package versions are authoritative.
