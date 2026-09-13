# Admin shared module

## RULE-SHR-01: Cấu trúc (P0)

```
src/shared/
├── constants/   # hằng số toàn app
├── form/        # helper react-hook-form + yup dùng chung
├── hooks/       # use-debounce, use-table-query, use-disclosure...
├── types/       # type trung lập domain
└── utils/       # hàm thuần
```

Kế thừa `admin-client/src/shared`.

## RULE-SHR-02: Test "trung lập" (P0)

Import `@/generated/api` hoặc nhắc tới order/product/customer ⇒ **không** thuộc `shared`, để trong `features/<feature>/model`.

## RULE-SHR-03: `features/shared/` không phải kho chứa (P0)

Chỉ dành cho placeholder/composition có chủ đích (`00-directory-structure.md`). Util dùng chung đi vào `src/shared`, UI dùng chung đi vào `src/foundation`.

## RULE-SHR-04: `lib/` là adapter, không phải shared (P1)

`src/lib` chỉ chứa adapter framework/transport (api, media, validation). Không đặt business helper ở đây.
