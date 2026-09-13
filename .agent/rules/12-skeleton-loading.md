# Admin skeleton loading

Applies to every screen that renders data from `src/generated/api`.

## RULE-SKEL-01: Foundation skeleton only (P0)

Use `src/foundation/feedback/page-skeleton.tsx`. No per-feature shimmer CSS, no bare `<Spin />` over a whole page. A missing preset is added to `src/foundation/feedback`, not to the feature.

## RULE-SKEL-02: Decision tree

```
First load (no data)        -> skeleton matching the real layout
Refetch with data present   -> keep the table, use Ant Design `loading` on the table only
Pagination / sort / filter  -> keep rows, table-level loading; never blank the page
Mutation in flight          -> disable the submit control, not the page
Permission denied / 4xx     -> QueryErrorAlert, not a loading state
```

## RULE-SKEL-03: Skeleton mirrors the layout (P0)

Same column count, same toolbar and pagination height. A table that jumps between skeleton and data is a layout regression (`06-quality.md`).

## RULE-SKEL-04: Counts

| Surface | Count |
| --- | --- |
| Table | page size, capped at 10 rows |
| Detail page | 1 block per card/section |
| Form modal | fields at real height |
| Dashboard widget | one skeleton per widget, never one for the whole grid |

## RULE-SKEL-05: Condition pattern

```tsx
// ✅ skeleton only when there is nothing to show
{isPending && !data ? <PageSkeleton /> : isError ? <QueryErrorAlert error={error} /> : <OrderTable ... loading={isFetching} />}

// ❌ flickers on every refetch and loses scroll/selection
{isFetching ? <PageSkeleton /> : <OrderTable ... />}
```

## Anti-patterns

| ❌ Don't | ✅ Do |
| --- | --- |
| Full-page `<Spin />` | `PageSkeleton` / table `loading` |
| Skeleton on every refetch | keep rows, table-level loading |
| Skeleton that clears row selection | preserve selection across refetch |
| Feature-local skeleton component | foundation preset |
