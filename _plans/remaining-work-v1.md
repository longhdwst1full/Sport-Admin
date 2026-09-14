# Phương án cho phần việc còn lại

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-14
>
> **Change summary:** Chốt thứ tự cho 4 nhóm việc còn tồn sau khi đóng refactor base, Sprint 4/5 và S6.4 Flash Sale.

## Nguyên tắc xếp thứ tự

1. **Việc đang dở nguy hiểm hơn việc chưa bắt đầu.** Flash Sale đã chạy thật nhưng thiếu worker dọn quota — để lâu thì suất bị giữ vĩnh viễn.
2. **Việc chặn doanh thu trước việc chặn trải nghiệm.** Return/Refund liên quan tiền; banner trang chủ thì không.
3. **Không mở wave mới khi wave trước còn operation generated chưa ai gọi** (`RULE-CTR-06`).

---

## W1 — Đóng nốt Flash Sale (0.5 ngày)

Việc nhỏ nhưng là lỗ hổng đang mở.

| Việc | Chi tiết |
| --- | --- |
| Worker `expireStaleQuota` | Theo đúng mẫu `reservation-expiry`: controller nhận `CRON_SECRET`, batch size từ env, metric claim/processed tách biệt |
| Supabase Cron | Thêm configurator như `cron:reservation:set`, chạy mỗi 5 phút |
| Integration test | Quota quá hạn được trả về pool; chạy hai lần không trừ hai lần |

**Rủi ro nếu bỏ qua:** khách bỏ giỏ giữa chừng thì suất flash bị giữ tới khi có người release thủ công. Chương trình càng chạy lâu càng hụt suất bán.

**Done khi:** quota `ACTIVE` quá hạn tự chuyển `EXPIRED` và `reservedQuantity` giảm tương ứng, có evidence cron HTTP 200.

---

## W2 — Sprint 6: Return → Inspection → Refund (5–7 ngày)

Bốn wave theo `api/document/33-sprint-6-execution-plan.md`, đi tuần tự.

### Decision đã chốt

| # | Quyết định |
| --- | --- |
| 1 | Cửa sổ đổi trả **7 ngày** từ `DELIVERED` |
| 2 | Guest **không tự tạo**; gọi hotline, nhân viên tạo hộ sau khi xác minh mã đơn |
| 3 | **STAFF tạo → chờ OWNER/BRANCH_MANAGER duyệt. OWNER/BRANCH_MANAGER tạo → duyệt luôn** |
| 4 | Chỉ hoàn giá trị item; hoàn cả phí ship khi **lỗi thuộc về shop** |
| 5 | Khách trả tiền mặt/COD → **hoàn tiền mặt tại cửa hàng**, có thoả thuận hai bên. Không hoàn online |

### ⚠ Còn thiếu 1 ý — chặn migration S6.1

**Có loại trừ nhóm hàng nào khỏi đổi trả không?** Ví dụ găng tay, băng quấn, thảm đã bóc tem, hàng đặt riêng theo yêu cầu.

Nếu chưa quyết, phương án mặc định: thêm cờ `returnable` ở cấp **Category**, Admin tự bật/tắt. Không hardcode danh sách trong code.

### S6.1 — Return policy & request

- Bảng `return_policies`, `return_requests`, `return_items`, `return_status_history`
- Snapshot `policy_id` vào request: đơn mua theo chính sách nào thì xử theo chính sách đó, đổi chính sách sau không áp ngược
- Eligibility: `DELIVERED` + 7 ngày, kiểm tra `returnable` của category
- Trả một phần item/quantity; **combo phải trả nguyên dòng**
- Quantity cộng dồn qua nhiều lần trả không vượt số đã mua — ràng buộc ở database
- `RET-01` Account own return, `RET-02` Admin review approve/reject theo quy tắc role ở decision 3

### S6.2 — Receive & inspection

- `RET-03` nhận đúng warehouse đã xuất
- Phân loại `SELLABLE` / `DAMAGED` / `MISSING`; chỉ `SELLABLE` restock
- Movement atomic, retry-safe, tái dùng đúng pattern của `fulfillment.receive-return`

### S6.3 — Refund

- Bảng `refunds`, `refund_transactions` (append-only)
- Trần refund: `Σ item được duyệt (+ phí ship nếu lỗi shop)` ≤ số tiền Payment đã nhận — ràng buộc ở database
- Trường `fault: SHOP / CUSTOMER` quyết định có hoàn ship hay không
- `refund_method`: `BANK_TRANSFER` (bắt buộc `external_ref`) và `CASH_AT_STORE` (bắt buộc xác nhận của khách)
- `SUCCESS` chỉ khi tiền đã thật sự rời đi, không phải khi bấm duyệt
- Maker-checker theo role: permission `refund.request` / `refund.approve` / `refund.execute`

### S6.4 — Flash Sale

✅ Đã xong. Còn W1 ở trên.

---

## W3 — Nối nốt operation đã generate (1–2 ngày)

Hai khoản nợ `RULE-CTR-06`: operation đã sinh nhưng chưa ai gọi.

| Việc | Hiện trạng | Phương án |
| --- | --- | --- |
| SDK `cart` | Toàn bộ mutation guest/account chỉ 1 file dùng (`checkout.workflow.ts`); giỏ hiển thị thuần Redux | Nối `useCreateGuestCart` / `useSetGuestCartItem` / `useUpdateGuestCartItem` / `useRemoveGuestCartItem`. Redux giữ vai trò UI state lạc quan, server là nguồn sự thật |
| `quoteShipping` | **0 file dùng** | Quyết định: nối vào bước xem trước phí ở giỏ hàng, hoặc ghi lý do không dùng vào `features/checkout/README.md` |

**Giá trị:** giỏ hàng đồng bộ giữa thiết bị — hiện mở máy khác là mất giỏ.

---

## W4 — Gỡ 3 nhóm mock còn lại (phụ thuộc BE)

| Nhóm | File | BE cần làm |
| --- | --- | --- |
| Thông báo | `widgets/site-header/header-notifications.tsx` | Model `Notification` + `GET /customer/notifications` + `POST .../read` |
| Bảo hành | `features/profile/pages/profile-page.tsx` | Model `Warranty` gắn `OrderItem` + `GET /account/warranties` |
| Marketing trang chủ | 7 component trong `features/home` | Mở rộng `ContentPost` thêm `postType` `BANNER`/`PARTNER`/`STAT`, hoặc module CMS riêng |

**Đề xuất:** nhóm marketing làm bằng cách mở rộng `ContentPost` — model đã có, chỉ thêm giá trị `postType` và trường cần thiết. Rẻ hơn nhiều so với module CMS mới.

Hai nhóm còn lại là tính năng thật, nên xếp sau Sprint 6.

---

## Việc lẻ

- [ ] `search-page` chưa lọc theo từ khoá (BE-2) — cần `q` trong `listCatalogProducts`
- [ ] `admin/customers` vẫn chạy `customers.fixture.ts`, chưa có operation `Admin Customers` nào
- [ ] Địa giới VN gọi third-party `vietnam-address.service.ts` — giữ hay chuyển về API nội bộ
- [ ] `vendor-charts` 391 kB (recharts) load ở mọi route admin — lazy theo route dashboard
- [ ] Cân nhắc kế thừa luồng duyệt của `fund-ops-service` cho `system_parameters` khi áp quy tắc role ở decision 3

---

## Thứ tự đề xuất

```
W1 (0.5 ngày)  →  W2 S6.1 → S6.2 → S6.3 (5–7 ngày)  →  W3 (1–2 ngày)  →  W4 (chờ BE)
```

W1 làm trước vì đang là lỗ hổng mở. W3 có thể chen vào lúc chờ quyết định của W2.

## Rủi ro

| Rủi ro | Giảm thiểu |
| --- | --- |
| Bắt đầu S6.1 khi chưa chốt nhóm hàng loại trừ | Làm cờ `returnable` ở Category, không hardcode |
| Refund tính sai trần khi trả một phần | Ràng buộc tổng ở database, không chỉ ở service |
| Nối SDK cart làm hỏng giỏ đang có của khách | Đổi khoá lưu trữ phải có đường migrate, không im lặng làm mất giỏ |
| Mở rộng `ContentPost` cho banner làm loãng model | Nếu quá 3 `postType` mới thì tách module CMS riêng |

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-14 | Chốt phương án cho 4 nhóm việc còn tồn. | Execution review |
