# Admin feature anatomy

Chuẩn hoá theo `admin-client` — nơi ~120 feature dùng đúng một khuôn.

## RULE-FA-01: Khuôn thư mục (P0)

```
src/features/<feature>/
├── components/    # khối UI của riêng feature (drawer, panel, table cell)
├── constants/     # hằng số, option, label map
├── hooks/         # use-*.ts gọi generated SDK + mapping
├── model/         # mapper, policy, type nội bộ + test
├── pages/         # màn hình, mỏng, chỉ orchestration
└── index.ts       # public API duy nhất của feature
```

Không bắt buộc tạo đủ thư mục; tạo khi có file thật. **Cấm thư mục rỗng và wrapper một dòng.**

## RULE-FA-02: File phẳng trong feature là lỗi (P0)

```
❌ features/products/{products-page.tsx, product-form-drawer.tsx, product-media.policy.ts, ...}  // 11 file phẳng
✅ features/products/{pages/products-page.tsx, components/product-form-drawer.tsx, model/product-media.policy.ts}
```

## RULE-FA-03: Chỉ import qua barrel (P0)

```ts
// ❌ import { ProductsPage } from '@/features/products/pages/products-page';
// ✅ import { ProductsPage } from '@/features/products';
```

Feature không import file nội bộ của feature khác (`00-directory-structure.md`).

## RULE-FA-04: `slice/` chỉ khi có workflow thật (P1)

Redux slice đặt trong `features/<feature>/slice/`. Không tạo slice cho state chỉ sống trong một màn hình — dùng state cục bộ (`07-state-tools-performance.md`).
