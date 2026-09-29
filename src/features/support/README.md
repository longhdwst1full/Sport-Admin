# Support — Hàng đợi hỗ trợ — maintenance note

> **Document version:** 1.0.1
>
> **Last updated:** 2026-09-29
>
> **Change summary:** Ghi nhận test của feature; lệnh admin trả 200 kèm chi tiết ticket (không đổi hành vi UI).

## Phạm vi

Nhân viên tiếp nhận ticket khách gửi (nguồn V1: `CHAT`), giao người xử lý, trả lời khách hoặc ghi chú nội bộ,
đánh dấu đã giải quyết và đóng ticket.

Ngoài phạm vi: tạo ticket hộ khách (`support.ticket.create` chưa có màn), sửa tiêu đề/ưu tiên, mở lại ticket
đã đóng, thông báo realtime khi có tin mới (phải bấm Làm mới hoặc mở lại drawer).

## Route, menu, entry

- Route `/support-tickets`, menu "Hàng đợi hỗ trợ" (nhóm Bán hàng), cùng gate `support.ticket.view`.
- Public entry: `SupportTicketsPage` (`index.ts`). Drawer chi tiết mở bằng `?id=<ticketId>`.

## Generated operation và mapping

`src/generated/api/support`: `useListAdminSupportTickets`, `useGetAdminSupportTicket`,
`assignAdminSupportTicket`, `addAdminSupportTicketMessage`, `resolveAdminSupportTicket`,
`closeAdminSupportTicket` (bốn lệnh override `apiFetcherWithOptions` trong `orval.config.ts` để gửi header).

- `model/support-ticket.mapper.ts` là nơi duy nhất đọc DTO: `null` → `undefined`, `isInternal` → `internal`.
  Query hook dùng `select`, nên **cache giữ DTO thô**; mutation ghi response DTO vào key chi tiết.
- `version` là chuỗi số (bigint) — giữ nguyên chuỗi, không ép `Number`.
- DTO chỉ có `branchId`; tên chi nhánh tra qua `hooks/use-branch-labels.ts` (lookup chi nhánh đang hoạt
  động, tối đa 50). Chi nhánh không có trong lookup hiện `#<id>`.

## Vòng đời và quyền

| Lệnh | Trạng thái hợp lệ | Quyền | Ghi chú |
| --- | --- | --- | --- |
| Giao việc / giao lại | OPEN, ASSIGNED | `support.ticket.assign` | Người nhận: "Tôi" + nhân viên ACTIVE nếu có `iam.user.view` |
| Trả lời / ghi chú nội bộ | khác CLOSED | `support.ticket.manage` | Mỗi tin tăng `version`; response là chi tiết ticket |
| Giải quyết | ASSIGNED | `support.ticket.manage` | Bắt buộc ghi chú (≤ 1000 ký tự) |
| Đóng | RESOLVED | `support.ticket.close` | Sau khi đóng chỉ còn đọc |

`model/support-ticket-actions.policy.ts` chỉ quyết định affordance; API là nguồn quyết định cuối và giới hạn
theo phạm vi chi nhánh của token (`branchId` trên URL chỉ thu hẹp, không mở rộng quyền).

## Concurrency, idempotency, cache

- Mọi lệnh gửi `expectedVersion` = `version` của lần tải gần nhất.
- Header `Idempotency-Key` bắt buộc (8-120 ký tự), sinh bằng `nextIdempotencyKey` (`shared/utils/idempotency`):
  gửi lại cùng nội dung dùng lại key, đổi nội dung sinh key mới, thành công xoá key.
- Lỗi `SUPPORT_VERSION_CONFLICT`, `SUPPORT_CONCURRENT_UPDATE`, `SUPPORT_INVALID_TRANSITION`,
  `SUPPORT_TICKET_CLOSED` → invalidate chi tiết + danh sách; `SUPPORT_IDEMPOTENCY_CONFLICT` → bỏ key.
  Thông điệp tiếng Việt theo mã ở `model/support-command-error.ts`.
- Thành công: `setQueryData` chi tiết từ response, invalidate `getListAdminSupportTicketsQueryKey()`.

## Trạng thái UI

List: loading bảng, lỗi `QueryErrorAlert` có Thử lại, rỗng "Không có ticket phù hợp bộ lọc.". Drawer: skeleton
card, lỗi có Thử lại, ô trả lời disabled kèm lý do (đã đóng / thiếu quyền). Modal/ô trả lời chỉ đóng/xoá khi lệnh
thành công. Ghi chú nội bộ hiển thị nền vàng + khoá + nhãn "Nội bộ".

## Kiểm thử / checklist khi sửa

- Test: `model/support-ticket-actions.policy.test.ts`, `support-ticket.mapper.test.ts`, `support-command-error.test.ts`.
- Đổi contract: `yarn contracts:sync && yarn generate:api`, sửa mapper, không sửa `src/generated`.
- Thêm trạng thái/ưu tiên: `Record<Enum, …>` trong `constants/support.constants.ts` sẽ báo lỗi compile.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.0.1 | 2026-09-29 | Ghi nhận test; contract lệnh trả 200. | feat/assistant-v1 review fixes |
| 1.0.0 | 2026-09-29 | Tạo feature và nối SDK support. | feat/assistant-v1 |
