# Admin OpenAPI spec management

Bổ trợ `02a-contract-change-workflow.md`.

## RULE-SPEC-01: `contracts/` là bản sao (P0)

```bash
yarn contracts:sync   # api/document/api/admin/*.yaml -> contracts/admin/*.yaml
yarn generate:api
```

Sửa `contracts/` bằng tay = contract ma. Sửa `api/`, sync lại.

## RULE-SPEC-02: Kiểm tra drift trước khi claim (P0)

So số `operationId` giữa `api/document/api/admin/<domain>.yaml` và `contracts/`. Lệch ⇒ chưa sync, mọi kết luận "API đã có" vô hiệu.

## RULE-SPEC-03: Chỉ tag `Admin *` (P0)

Operation `Storefront *` lọt vào SDK admin là lỗi cấu hình Orval.

## RULE-SPEC-04: Operation generated chưa dùng phải ghi nhận (P1)

Ghi vào README của feature sở hữu kèm điều kiện gỡ bỏ (`RULE-CTR-06`), không xoá domain khỏi `orval.config.ts`.

## RULE-SPEC-05: Thiếu endpoint = task BE kèm evidence (P0)

Nêu endpoint cần + file controller trong `api/` chứng minh chưa có + màn hình bị chặn. Không tự chế DTO (`RULE-CTR-02`).
