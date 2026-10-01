# Admin Procurement — checklist hoàn thiện và nghiệm thu

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-30
>
> **Change summary:** Hoàn thành bước đầu PROC-FE-01 và search server-side của PROC-FE-02; giữ rõ các gate chưa đạt.

## Baseline

- Route `/procurement` có bốn tab: NCC, đơn mua hàng, phiếu nhập và trả NCC.
- SDK sinh từ `contracts/admin/procurement.yaml`; không sửa `src/generated/api` bằng tay.
- Lint, 53 file/290 unit test và build pass ở lượt 2026-09-30. Hai policy test Procurement pass; chưa có Playwright/Storybook riêng cho feature.
- API live trả 28 operation trong OpenAPI, nhưng trạng thái **Admin deployed + UAT browser** chưa có evidence.

## Checklist triển khai theo thứ tự

| ID | Ưu tiên | Việc cần làm | Acceptance |
| --- | --- | --- | --- |
| PROC-FE-01 | P0 | Chọn PO thì tự tải các dòng còn nhận, SKU và giá; đổi PO làm mới dòng, bỏ input `purchaseOrderItemId` thô | Một phiếu nhập có thể nhận một phần, nhận tiếp; không chọn nhầm dòng PO khác |
| PROC-FE-02 | P0 | Thay các lookup chỉ lấy 50/100 bản ghi bằng search + pagination server-side, giữ option đã chọn trong edit | Tìm/chọn được NCC, PO, receipt, SKU và kho ngoài trang đầu |
| PROC-FE-03 | P0 | Phiếu trả lọc receipt theo NCC/kho và dòng đã nhập còn trả được | Không chọn sai NCC/kho hoặc vượt số còn trả ở UI; Backend vẫn kiểm lần cuối |
| PROC-FE-04 | P1 | Thêm validation số lượng/giá/thuế, trạng thái loading/empty/error/403 và xử lý 409 version stale cho drawer | Dữ liệu đang nhập không mất khi lỗi; có đường tải bản mới |
| PROC-FE-05 | P1 | Kiểm permission/menu/action với OWNER, BRANCH_MANAGER, STAFF và scope chi nhánh | UI ẩn action đúng; gọi API trái quyền vẫn bị Backend chặn |
| PROC-FE-06 | P1 | Playwright bốn tab và các transition chính; Storybook form/list/detail/error | Chạy được trên mock API; không phụ thuộc dữ liệu Supabase thật |
| PROC-FE-07 | P1 | UAT trình duyệt thật, đối chiếu DB trước/sau post receipt và ship return | Có screenshot, request ID, ID chứng từ và movement/WAC khớp |

## Tiến độ 2026-09-30

- `PROC-FE-01`: FE đã chọn dòng PO từ detail API, tự khởi tạo các dòng còn nhận, hiện SKU/giá/số còn nhận và không cho nhập ID dòng PO bằng tay. Mapper test pass. Chưa có UAT nhận một phần/nhận tiếp trên trình duyệt; chưa đóng acceptance.
- `PROC-FE-02`: NCC, kho, PO, SKU và phiếu nhập đã có tìm kiếm server-side theo từ khoá. Mỗi lần tìm hiện vẫn chỉ tải trang đầu (50/100 dòng); phân trang trong dropdown và giữ option đã chọn cần hoàn tất.
- `PROC-FE-03`: dropdown receipt đã lọc đúng NCC/kho và xoá lựa chọn cũ khi đổi một trong hai; vẫn thiếu lookup SKU/số lượng thực còn trả sau khi trừ các phiếu trả khác, nên chưa đóng.
- `PROC-FE-04` đến `PROC-FE-07`: chưa đóng. Backend tiếp tục là nguồn chặn cuối.
- Lint, build và 54 file/292 test Admin pass sau thay đổi. Chưa có Playwright Procurement hoặc UAT thật.

## Kịch bản UAT tối thiểu

1. NCC ACTIVE → PO DRAFT → SUBMITTED → APPROVED; PO vượt ngưỡng cần OWNER/duyệt tài chính theo backend.
2. WITH_PO nhận một phần rồi nhận tiếp; DIRECT_RECEIPT có lý do; post một lần làm tăng tồn và WAC đúng.
3. Phiếu trả gắn receipt, duyệt bởi người khác người tạo, ship trừ tồn và ghi movement một lần.
4. Dùng hai tab sửa cùng chứng từ để xác nhận `expectedVersion` trả 409 và FE giữ dữ liệu.
5. Nhân viên ngoài scope mở URL chi tiết trực tiếp nhận 404/403 đúng; không lộ NCC/chứng từ ngoài quyền.
6. Lặp cùng `Idempotency-Key` và hai request ghi sổ đồng thời phải được integration PostgreSQL API chứng minh, không chỉ Playwright mock.

## Gate

- `yarn contracts:sync` → `yarn generate:api` → lint/test/build/Storybook pass, contract không drift.
- Không còn lỗi P0/P1 trong các case trên.
- UAT trên môi trường deploy có chứng từ test được đánh dấu, đủ evidence FE + API + DB; không dùng screenshot list làm bằng chứng tồn/WAC.
- Cập nhật README feature và tài liệu trạng thái dự án khi hoàn tất từng gate.

## Revision history

| Version | Date | Change summary | Source / Change ID |
| --- | --- | --- | --- |
| 1.0.0 | 2026-09-30 | Tạo checklist FE Procurement và acceptance UAT. | PLAN-20260930-PROCUREMENT-UAT-RESTORE |
| 1.1.0 | 2026-09-30 | Ghi nhận PO receipt UI và server-search lookup, giữ rõ phần pagination/UAT còn thiếu. | PROC-FE-01/02 |
