# Admin React hooks

## RULE-HOOK-01: Không `setState` trong thân `useEffect` (P0)

```tsx
// ❌ useEffect(() => { setRows(toRows(data)); }, [data]);
// ✅ const rows = useMemo(() => toRows(data), [data]);
```

## RULE-HOOK-02: `useEffect` chỉ cho hệ thống ngoài (P0)

Subscription, timer, DOM API, Antd imperative API. Có đăng ký thì phải có cleanup.

## RULE-HOOK-03: Không mirror server state (P0)

TanStack Query sở hữu remote state; copy `data` sang `useState` là nhân bản cache (`07-state-tools-performance.md`).

## RULE-HOOK-04: Form state thuộc react-hook-form (P0)

Không đồng bộ song song giá trị form sang `useState`/Redux. Reset form bằng `reset()` khi DTO đổi.

## RULE-HOOK-05: Đặt hook đúng tầng (P1)

| Phạm vi | Vị trí |
| --- | --- |
| Biết DTO, 1 feature | `features/<feature>/hooks/use-*.ts` |
| Trung lập domain | `shared/hooks/use-*.ts` |
| Trình bày thuần | `foundation/hooks/use-*.ts` |
