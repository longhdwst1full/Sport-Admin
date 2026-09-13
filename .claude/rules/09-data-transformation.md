# Admin data transformation

Generated DTOs are transport shapes. Map them once, in the feature, in pure functions.

## RULE-DT-01: Three named mappers per entity (P0)

```ts
// src/features/orders/model/order.mapper.ts
export function toOrderRow(dto: AdminOrderDto): OrderRow {}        // DTO -> table row
export function toOrderForm(dto: AdminOrderDto): OrderFormValues {} // DTO -> form
export function toUpdateOrderPayload(v: OrderFormValues): UpdateOrderBody {} // form -> request
```

Only these functions read generated field names. Columns, forms and cells receive view models.

## RULE-DT-02: Never mutate the DTO (P0)

Query data is cache-owned. Derive new objects; never assign onto a response.

## RULE-DT-03: Derived column = explicit field (P0)

A column computed from several DTO fields gets its own key on the row type, computed in the mapper — not a render function that reaches back into the raw DTO.

```ts
// ❌ column render digs through the DTO
render: (_, r) => (r.bankFlag ? 'Bank' : r.retailFlag ? 'Retail' : '-')
// ✅ mapper computes it, column reads one key
{ dataIndex: 'channelLabel' }
```

## RULE-DT-04: Value shapes are declared, not improvised (P0)

| DTO type | Form value | Notes |
| --- | --- | --- |
| string | `string \| null` | trim in `toPayload`, not in the field |
| number | `number \| null` | set min/max/step on the input |
| percent | `number \| null` | UI 15 ⇄ payload 0.15, converted in the mapper |
| date | `Dayjs \| null` | ISO string in the payload |
| boolean | `boolean` | do not carry `'1'/'0'` into the form |
| enum | `string` | select options are always `{ value: string; label: string }` |
| relation id | `string \| null` | async select; label resolved separately |

Numeric backend codes are converted in the mapper, never in the component.

## RULE-DT-05: Enum → option pipeline (P1)

Codes come from generated DTOs; Vietnamese labels map beside them (`08-enums-constants.md`). Option arrays are memoized module- or hook-level constants, never rebuilt inline in render.

## RULE-DT-06: Immutable identifiers (P1)

Fields that cannot change on edit are disabled in the form and excluded from the update payload by the mapper (`05-list-form-patterns.md`).

## Anti-patterns

| ❌ Don't | ✅ Do |
| --- | --- |
| Generated model type in a leaf component's props | feature view model |
| `as any` to bridge DTO ↔ form | fix the mapper |
| Format money/date inline in a cell | `src/shared` formatter via the mapper |
| Build the update payload inside `onSubmit` | `toUpdate<Entity>Payload` |
