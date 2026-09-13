# Admin contract change workflow

The Admin app never invents an endpoint, a field or an enum value. Every HTTP shape traces to `api/` NestJS decorators.

## RULE-CTR-01: Direction of change (P0)

```
NestJS decorator (dctd-utc/api)
  -> api/openapi/openapi.json + api/document/api/admin/<domain>.yaml
  -> yarn contracts:sync        (contracts/admin/<domain>.yaml)
  -> yarn generate:api          (src/generated/api/**)
  -> feature code
```

Never edit a later stage to work around an earlier one.

## RULE-CTR-02: Missing field = backend task (P0)

```ts
// ❌ Wrong — hand-written type because the DTO lacks a field
type Order = AdminOrderDto & { slaBreached: boolean };

// ✅ Correct — add it in api/, regenerate, then consume the generated type
```

If the contract is wrong or incomplete, stop and report it with evidence (operationId + the `api/` source file). Do not patch it in the Admin app.

## RULE-CTR-03: Evidence before a contract claim (P0)

Any statement that an operation exists must cite the generated file and exported symbol, e.g. `src/generated/api/orders/orders.ts → useListAdminOrders`. An operation that is not in `src/generated/api` does not exist for the Admin app.

## RULE-CTR-04: Only Admin operations (P0)

Admin features import `Admin *` operations only. A `Storefront *` operation appearing under `src/generated/api` is a contract/Orval configuration failure, not something to consume.

## RULE-CTR-05: Generated output is disposable (P0)

`src/generated/api` and `contracts/` are never hand-edited and never carry comments. Fix the producer and regenerate (`00-document-versioning.md`, `02-api-contract.md`).

## RULE-CTR-06: Unused generated operations are a gap, not dead code (P1)

An operation generated but never imported means the feature is unfinished. Wire it up or record why in the feature README — do not delete the domain from `orval.config.ts`.
