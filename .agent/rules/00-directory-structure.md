# Admin directory structure

- `src/app`: providers, router, navigation and application-wide store composition.
- `src/layouts`: application shells only; no feature data fetching.
- `src/features/<feature>`: page, feature components, hooks, UI mapping and feature tests.
- `src/foundation`: reusable presentation/layout primitives without commerce orchestration.
- `src/core`: cross-feature policies such as authorization and browser storage (`core/storage`).
- `src/shared`: domain-neutral utilities/hooks/types.
- `src/lib`: framework/transport adapters with no commerce decisions.
- `src/generated/api`: disposable Orval output; never hand edit.

Features may depend on `foundation`, `core`, `lib` and generated contracts. They must not import another feature's internal components. Mỗi feature theo khuôn `13-feature-anatomy.md` (`components/constants/hooks/model/pages` + `index.ts`) và chỉ được import qua barrel.

Preferred admin flow, adapted from `admin-client` and `dragonx-employer-web`:

`route/navigation -> thin page -> feature hook/mapping -> generated SDK or workflow state -> foundation UI`.

Pages and presentation components do not call Axios directly. A feature owns DTO-to-form/table mapping, filters, mutation invalidation and UI states. Generated code remains transport infrastructure and Redux/Saga remains application workflow infrastructure; neither owns presentation policy.
