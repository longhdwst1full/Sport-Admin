# E2E — Playwright (Admin)

> **Version:** 1.0.0 · **Last updated:** 2026-09-16
> **Change summary:** Khởi tạo hạ tầng Playwright, quy trình và bộ testcase nền.

## 1. Mục tiêu và phạm vi

E2E ở đây **không** thay unit test. Phân tầng:

| Tầng | Công cụ | Sở hữu |
| --- | --- | --- |
| Mapper / policy / permission logic | Vitest (`src/**/*.test.ts`) | logic thuần, nhanh, nhiều case |
| Component / state UI | Storybook + Vitest + Testing Library | một màn hình, một component |
| **Luồng người dùng xuyên route** | **Playwright (`e2e/`)** | đăng nhập, RBAC, CRUD, workflow trạng thái |

Playwright chỉ nhận case **liên quan nhiều màn hình / nhiều bước / nhiều quyền**. Case chỉ để kiểm tra một hàm map DTO thì viết Vitest.

## 2. Kiến trúc thư mục

```
e2e/
├── fixtures/    # dữ liệu + session (auth.ts, permissions.ts, catalog.ts)
├── mocks/       # helper intercept API (api-mock.ts)
├── pages/       # page object, chứa selector — spec không tự đặt selector thô
├── specs/       # testcase, đặt tên <domain>-<màn hình>.spec.ts
└── README.md
```

Quy tắc:

- **Selector sống trong `pages/`**, spec chỉ mô tả hành vi. Đổi UI ⇒ sửa một chỗ.
- Ưu tiên `getByRole` / `getByPlaceholder` / `getByText` theo nhãn tiếng Việt thật của app; chỉ thêm `data-testid` khi không có neo ngữ nghĩa nào ổn định.
- Dữ liệu mock phải khớp DTO trong `src/generated/api` (`02a-contract-change-workflow.md`). Không bịa field.

## 3. Chạy

```bash
yarn test:e2e                 # build + preview trên :5199 rồi chạy toàn bộ
yarn test:e2e --ui            # chế độ UI của Playwright
yarn test:e2e products-list   # lọc theo tên file
yarn test:e2e:report          # mở HTML report gần nhất
E2E_DEV=1 yarn test:e2e       # dùng vite dev server thay cho bản build
E2E_BASE_URL=... E2E_NO_SERVER=1 yarn test:e2e   # trỏ vào server có sẵn
```

Mặc định chạy trên **bản build** (`vite build --mode e2e && vite preview`) vì gần production và không cần file watcher (máy dev dễ chạm trần `fs.inotify.max_user_watches`).

`.env.e2e` đặt `VITE_DEV_BYPASS_PERMISSIONS=false` — bắt buộc, nếu không mọi test RBAC đều pass giả.

## 4. Chiến lược API

Mặc định **mock toàn bộ HTTP bằng `page.route`**: test xác định, chạy được trong CI, không phụ thuộc backend hay dữ liệu seed.

- `mockJson(page, glob, body)` — stub 2xx.
- `mockError(page, glob, status, message)` — stub lỗi theo `ErrorResponseDto` (`statusCode`, `code`, `message`, `details`).
- `seedSession(page, { permissions })` — nạp cookie token + stub `/auth/me`; dùng cho mọi spec không phải spec đăng nhập.
- `blockUnmockedAdminApi(page)` — bật khi muốn phát hiện request chưa stub.

Lưu ý: fetcher xoay token **một lần** khi gặp 401, nên khi test 401 phải stub cả `/auth/refresh`.

Smoke test với backend thật (tuỳ chọn, chạy tay trước release): trỏ `E2E_BASE_URL` vào môi trường staging, chỉ chạy nhóm `@smoke` đọc-only.

## 5. Quy trình

### Khi thêm/sửa một feature

1. Đọc `src/features/<feature>/README.md` và rule liên quan.
2. Viết/sửa Vitest cho mapper, policy, permission.
3. Nếu thay đổi chạm **route, quyền, hoặc luồng nhiều bước** ⇒ thêm/sửa spec Playwright tương ứng.
4. `yarn lint && yarn test && yarn test:e2e` trước khi mở PR.

### Khi e2e đỏ

1. `yarn test:e2e:report` → xem trace/screenshot/video trong `e2e/.artifacts`.
2. Phân loại: **lỗi sản phẩm** (sửa code) vs **selector lệch** (sửa page object) vs **mock lệch contract** (sync lại contract, sửa fixture).
3. Không `test.skip` im lặng. Skip phải kèm lý do + điều kiện gỡ.

### Khi contract đổi

`yarn contracts:sync` → `yarn generate:api` → cập nhật fixture trong `e2e/fixtures` cho khớp DTO mới → chạy lại e2e.

## 6. Quy ước testcase

- ID: `<AREA>-<NN>` (`AUTH-01`, `RBAC-02`, `PRD-05`), viết ngay trong `test()`.
- Tiêu đề: `ID: điều kiện -> kết quả mong đợi`, tiếng Việt.
- Mỗi test độc lập, không phụ thuộc thứ tự, không dùng state của test trước.
- Không `waitForTimeout`; chờ bằng `expect(...)` hoặc `waitForRequest`.
- Một test kiểm một hành vi. Assert cả mặt tích cực (thấy cái đúng) lẫn tiêu cực (không thấy cái không được phép).

## 7. CI

Chạy sau unit test, trước deploy:

```yaml
- run: yarn install --frozen-lockfile
- run: npx playwright install --with-deps chromium
- run: yarn test:e2e
- uses: actions/upload-artifact@v4
  if: failure()
  with: { name: playwright-report, path: e2e/.report }
```

`retries: 2` chỉ ở CI. Test đỏ ngẫu nhiên (flaky) phải được sửa hoặc gỡ, không để retry che.
