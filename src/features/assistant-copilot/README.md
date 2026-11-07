# Assistant copilot — Trợ lý Copilot — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-11-07
>
> **Change summary:** Sửa tin USER bị vẽ lặp với pending bubble, khóa gửi cùng tick, deadline/abort cho request chat và hủy history GET cũ trước khi ghi cache câu trả lời.

## Phạm vi

Nhân viên hỏi trợ lý về đơn hàng, tồn kho, hàng tồn thấp, sổ kho, chuyển kho, kiểm kê (V1.0b, chỉ đọc) và xác
nhận/từ chối bản nháp điều chỉnh tồn do trợ lý lập (`STOCK_ADJUSTMENT`, V1.1). Trợ lý không bao giờ tự ghi dữ liệu.

CONTRACT: `AdminChatMessageDto` chỉ có `content` (đã che PII) + `actionDraftIds`. Kết quả tool chỉ đọc nằm trong
câu trả lời văn bản; API **không** trả thẻ dữ liệu có cấu trúc (đơn, tồn, sổ kho...), nên UI không có thẻ đó.
Đếm mù kiểm kê (không lộ `systemQuantity` khi DRAFT) do tool phía API đảm bảo.

Ngoài phạm vi: tải tin cũ hơn trang đầu (`COPILOT_LIMITS.MESSAGE_PAGE_SIZE` tin gần nhất), streaming, danh sách
hội thoại cũ, loại bản nháp khác `STOCK_ADJUSTMENT`, gợi ý ngữ cảnh từ trang Sản phẩm (trang chỉ có `slug`).

## Entry, quyền, ngữ cảnh trang

- `CopilotLauncher` (header `AdminLayout`): nút chỉ hiện khi có ĐỦ `assistant.use` và `assistant.tool.execute`
  (`useCanAll`). Drawer nạp lười (`copilot-drawer.tsx`), giữ trạng thái khi đóng/mở lại.
- Hai mã trên chỉ bật tính năng; dữ liệu mỗi tool do quyền nghiệp vụ nền và phạm vi chi nhánh của chính nhân viên
  quyết định ở API (D72). Xác nhận đề xuất cần thêm `inventory.stock.adjust`.
- Route Admin không đưa id lên URL, nên trang tự công bố gợi ý bằng `useCopilotPageHints` (qua
  `CopilotPageContextProvider` bọc shell):
  - `orders-page.tsx`: `orderId` khi drawer chi tiết đơn đang mở.
  - `inventory-page.tsx`: `sku` + `warehouseCode` khi drawer điều chỉnh tồn đang mở cho một dòng tồn.
- Drawer hiện các gợi ý dưới dạng tag, người dùng bấm "Bỏ" để không gửi kèm. Gợi ý gửi trong `pageContext`
  của tin nhắn; SECURITY: API không được coi đây là bằng chứng quyền.

## Generated operation và mapping

- `src/generated/api/assistant`: `createAdminChatConversation`, `sendAdminChatMessage`, `useListAdminChatMessages`,
  `useGetAdminActionDraft`, `confirmAdminActionDraft`, `rejectAdminActionDraft`.
- `orval.config.ts` override `apiFetcherWithOptions` cho `sendAdminChatMessage` (Idempotency-Key bắt buộc) và
  `confirmAdminActionDraft` (contract không khai header; FE vẫn gửi khoá theo lần bấm, API dùng `draft:<id>`).
- `model/copilot.mapper.ts` là nơi duy nhất đọc DTO; cache giữ DTO thô, query `select` sang view model
  (`model/copilot.types.ts`). `preview` được làm phẳng; `consistent = requestedOnHand − currentOnHand === delta`.
- Gửi tin thành công: nối `userMessage`/`assistantMessage` vào key `getListAdminChatMessagesQueryKey(id, params)`
  (bỏ trùng theo id) và ghi từng `actionDrafts[]` vào `getGetAdminActionDraftQueryKey(draftId)`.
- Nội dung tin hiển thị văn bản thuần (không render HTML/markdown từ LLM).
- Pending USER chỉ là optimistic bubble: khi đuôi lịch sử đã có USER cùng nội dung thì không vẽ lại; vẫn giữ typing indicator đến khi mutation kết thúc. Câu hỏi giống nhau ở lượt trước đã được trả lời không bị loại. Đối chiếu bằng nội dung chỉ áp cho đuôi USER chưa có ASSISTANT, không phải dedup toàn lịch sử; nội dung bị backend che PII có thể không khớp bản gốc.
- Ref `inFlight` gom hai lần gửi trong cùng tick thành một promise (React chưa kịp cập nhật isPending); không tạo hai hội thoại/request. POST có timeout 90s; toàn lượt (tạo hội thoại, POST, polling 409 và replay) có deadline 180s và AbortSignal dùng chung. Hết hạn thoát pending + hiện lỗi, giữ key cho retry cùng câu hỏi, không tự retry POST sau lỗi mạng. Abort phía trình duyệt không bảo đảm backend dừng xử lý; idempotency phía API vẫn bắt buộc.
- Hủy query history đang bay trước khi nối response vào cache để GET cũ không ghi đè mất tin ASSISTANT. Sau lỗi, invalidate lịch sử hội thoại hiện tại để có thể thấy kết quả backend đã lưu. Không đổi HTTP contract, generated SDK, quyền hoặc thuật toán xử lý LLM phía API.

## Bản nháp điều chỉnh tồn

| Trạng thái | Hiển thị / thao tác |
| --- | --- |
| PENDING | Kho, SKU, hiện tại, yêu cầu, chênh lệch (+/-), lý do, chi nhánh, đếm ngược đến `expiresAt`; Xác nhận (cần `inventory.stock.adjust`), Từ chối (lý do tuỳ chọn 3-500 ký tự) |
| CONFIRMED | "Đang thực hiện" + Tải lại |
| EXECUTED | Số phiếu điều chỉnh `resultRef` |
| FAILED | Thông điệp theo `errorCode`; `INVENTORY_EXPECTED_ON_HAND_MISMATCH` → "Hỏi lại trợ lý" |
| REJECTED / EXPIRED | Chỉ đọc; EXPIRED có "Hỏi lại trợ lý" |

- Xác nhận trả **200** kèm bản nháp EXECUTED hoặc FAILED — lỗi nghiệp vụ (tồn đã đổi) nằm ở `errorCode`, không
  phải HTTP lỗi. HTTP 409/403/404 chỉ cho lỗi lệnh.
- PENDING quá hạn trên đồng hồ máy hiện EXPIRED ngay và đọc lại bản nháp một lần (API đánh dấu EXPIRED khi đọc).
- Modal xác nhận nhắc lại hệ quả: điều chỉnh bằng tài khoản người bấm, ghi sổ kho ngay, không hoàn tác bằng Từ
  chối, API từ chối nếu tồn thực tế khác số hiện tại.
- CONCURRENCY: xác nhận gửi `payloadHash` + `expectedVersion` (số); từ chối gửi `expectedVersion` (+ `reason`).
  Mã stale (`ACTION_DRAFT_STALE_ERROR_CODES`: EXPIRED, NOT_PENDING, PAYLOAD_HASH_MISMATCH, VERSION_CONFLICT,
  EXECUTION_IN_PROGRESS) → invalidate bản nháp.
- IDEMPOTENCY: gửi tin kèm `Idempotency-Key` từ `nextIdempotencyKey` (cùng nội dung dùng lại key, đổi nội dung
  sinh key mới, thành công xoá key, `IDEMPOTENCY_KEY_REUSED` bỏ key). Xác nhận lặp khi đã EXECUTED/FAILED trả kết
  quả cũ (API).

## Lỗi (`model/copilot-error.ts`)

| Lỗi | Thông điệp / phản ứng |
| --- | --- |
| `ASSISTANT_UNAVAILABLE` hoặc 503 | "Trợ lý đang tạm ngưng" |
| `ASSISTANT_QUOTA_EXCEEDED` hoặc 429 | Hết lượt hỏi, thử lại sau |
| 403 (`ASSISTANT_BRANCH_SCOPE_DENIED`, `ASSISTANT_STAFF_USER_REQUIRED` có câu riêng) | Không có quyền / ngoài phạm vi / cần tài khoản nhân viên |
| `ASSISTANT_CONVERSATION_CLOSED` / `_NOT_FOUND` | Bỏ id hội thoại; lần gửi sau tạo hội thoại mới |
| `ASSISTANT_INPUT_TOO_LONG`, `_INPUT_EMPTY`, `_CONTENT_INVALID`, `_TURN_IN_PROGRESS`, `IDEMPOTENCY_KEY_REUSED` | Câu riêng |
| `ASSISTANT_DRAFT_*` (NOT_FOUND, EXPIRED, NOT_PENDING, PAYLOAD_HASH_MISMATCH, VERSION_CONFLICT, EXECUTION_IN_PROGRESS, PERMISSION_DENIED) | `actionDraftErrorMessage` |
| `errorCode` của bản nháp FAILED | `actionDraftFailureMessage` (mã lạ hiện nguyên mã) |

## Kiểm thử / checklist khi sửa

- Test: `model/copilot.mapper.test.ts`, `action-draft.policy.test.ts`, `copilot-error.test.ts`, `copilot-request.test.ts`, `hooks/use-copilot-chat.test.tsx`, `components/copilot-message-list.test.tsx` (pending đã có trên history, gửi kép, retry cùng key, timeout/abort, cache).
- Đổi contract: `yarn contracts:sync && yarn generate:api`, sửa mapper/constants; không sửa `src/generated`.
- Thêm trạng thái bản nháp: `Record<AssistantActionDraftStatus, …>` trong constants báo lỗi compile.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.2.0 | 2026-11-07 | Pending bubble không nhân đôi USER; request deadline/abort, gom gửi kép và chặn GET lịch sử cũ ghi đè câu trả lời. | Copilot pending regression |
| 1.1.0 | 2026-09-30 | Nối SDK thật, mã lỗi thật; bỏ adapter và thẻ dữ liệu chỉ đọc. | API 5773c18 |
| 1.0.0 | 2026-09-29 | Tạo feature, adapter chưa nối. | feat/assistant-v1 |
