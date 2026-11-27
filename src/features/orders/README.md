# Orders — maintenance note

> **Document version:** 1.13.0
>
> **Last updated:** 2026-11-27
>
> **Change summary:** Cấu hình Supabase Realtime đọc từ tham số hệ thống qua `getAdminRealtimeConfig` (biến `VITE_SUPABASE_*` chỉ còn là dự phòng). Trước đó: Nhịp tim Realtime (`heartbeat` từ pg_cron mỗi 5 phút): còn nhận nhịp tim thì kênh `live` và polling `live-summary` thưa xuống 10 phút; chỉ nối mà chưa có nhịp tim thì giữ 60 giây. Trước đó: Báo đơn mới tức thì qua Supabase Realtime (tín hiệu rỗng từ trigger DB, chỉ sự kiện về đơn; polling hạ còn dự phòng 60 giây khi kênh nối). Trước đó: Báo đơn mới: polling `getAdminOrderLiveSummary`, số chờ xác nhận trên menu, `OrderLiveWatcher` (toast/âm báo/thông báo hệ điều hành). Trước đó: `PosOrderDrawer` nạp lười (`lazy` + `Suspense`, chỉ mount sau lần bấm "Tạo đơn" đầu) nên module POS không nằm trong chunk `/orders`. Trước đó: Dòng đơn có nhãn "Giá flash sale" (`OrderItemDto.flashSale`) ở chi tiết đơn, hoá đơn in, biên lai POS — phân biệt dòng flash và dòng giá thường cùng sản phẩm.

## Phạm vi

Feature hiển thị aggregate `orders`, snapshot người nhận/sản phẩm/tổng tiền và lịch sử trạng thái. Đây không phải danh sách checkout cần tư vấn giao hàng.

## Ranh giới và contract

- `pages/orders-page.tsx` sở hữu tab/search/page/pageSize và gọi `useListAdminOrders`.
- Drawer POS (`PosOrderDrawer`) nạp lười (`lazy` + `Suspense fallback={null}`) và chỉ mount sau lần bấm "Tạo đơn" đầu tiên; không import tĩnh `@/features/pos` ở trang này.
- `components/order-table.tsx` chỉ trình bày `OrderRow` (map bằng `toOrderRow`) và phát action chọn order.
- `components/order-detail-drawer.tsx` tự tải detail qua `useGetAdminOrder`, map một lần bằng `toOrderDetailView` rồi ghép các thẻ `order-detail-header`, `order-recipient-card`, `order-payment-card`, `order-items-card`, `order-status-history-card`, `order-action-footer` (khung chung `order-info-card`).
- Điều kiện bật nút huỷ/xác nhận/hoàn tất ở `model/order-actions.policy.ts` (gương `order-transition.service.ts`); mutation + idempotency + invalidation ở `hooks/use-order-action.ts`. 409 thì tải lại chi tiết.
- Panel giao vận (`FulfillmentWorkflowPanel`) và nhãn trạng thái vận đơn (`FulfillmentStatusTag`) thuộc `fulfillments`; `OrderDetailDrawer` nhận qua prop `renderFulfillmentPanel` / `renderShipmentStatus` để không import ngược.
- Mọi request dùng `src/generated/api/orders`; không hard-code URL và không sửa file generated.
- Backend bắt buộc kiểm tra `order.view` và branch scope. Permission route phía FE chỉ cải thiện UX.
- Tab `Vận chuyển` map server-side sang `PICKING|PACKED|SHIPPED`; `Đã giao` map sang `DELIVERED|COMPLETED`.
- `AWAITING_SHIPMENT` (`CONFIRMED|PICKING|PACKED`) là nhóm chỉ-lọc cho link KPI "Đơn đang chờ giao" ở Dashboard; chỉ hiện thành tab khi URL `status=AWAITING_SHIPMENT` (`orderFilterOnlyTabs`).
- Search chạy server-side, mỗi ô một điều kiện AND: `orderNo`, `recipientName`, `recipientPhone`.
- `order.manage` mới hiển thị action. Hủy chỉ hợp lệ khi đơn chưa thanh toán/xử lý; manual complete chỉ hợp lệ sau khi giao đủ và thu đủ tiền, không giới hạn trong ngày.
- Fulfillment transition dùng permission riêng (`pick/pack/ship/delivery_update`), expected version và Idempotency-Key; Backend vẫn kiểm tra state/payment/stock/scope.
- Transition gửi `expectedVersion`, `Idempotency-Key` và lý do bắt buộc; Backend vẫn là nguồn quyết định cuối cùng.
- "Huỷ sau giao thất bại" (`cancelAdminOrderAfterFailedDelivery`, `order.manage`): nút chỉ hiện khi `SHIPPED` + fulfillment `RETURNED`. Hộp xác nhận (`useConfirmWithReason` + `OrderFailedDeliveryCancelSummary`) hiện trạng thái đơn/thanh toán, tổng đơn và hệ quả; lý do ≥ 3 ký tự. Đơn đã thu (payment `SUCCESS`) → API giữ `SUCCESS` + cờ hoàn tay, UI cảnh báo kế toán hoàn ngoài hệ thống rồi ghi nhận ở màn Thanh toán (`recordManualRefundAdmin`). `OrderDetailDto` không có số tiền đã thu nên chỉ hiện tổng đơn làm tham chiếu.
- Sau mutation, detail cache được cập nhật và toàn bộ list/tab Order được invalidate vì bản ghi có thể đổi tab.

## Báo đơn mới (Realtime + polling dự phòng)

- **Realtime (Supabase Broadcast):** trigger DB của API phát tín hiệu RỖNG lên kênh công khai `dctd-staff-alerts` khi có
  sự kiện **về đơn** (đơn web mới, khách huỷ, ảnh chuyển khoản, VNPay thành công). `lib/realtime/staff-alert-channel.ts` giữ MỘT
  WebSocket dùng chung (đếm tham chiếu); nhận tín hiệu thì `useOrderLiveSummary` invalidate `live-summary` và hàng đợi thông
  báo (`listAdminNotifications`, chỉ tải lại khi màn đó đang mở). Tín hiệu qua bộ gộp (`lib/realtime/coalesce.ts`): chạy ngay lần
  đầu, tối đa 1 lần/5 giây — kênh công khai nên tín hiệu giả chỉ gây một refetch bị chặn tần suất. Tín hiệu không mang dữ
  liệu; số liệu thật vẫn lấy qua API có xác thực, theo chi nhánh.
- **Cố ý không** báo phiếu hỗ trợ và job đồng bộ (Facebook/TikTok, thẻ job health vẫn polling 60 giây riêng).
- Cấu hình (ưu tiên từ trên xuống): tham số hệ thống `SUPABASE_URL` + `SUPABASE_ANON_KEY` do API trả qua `getAdminRealtimeConfig` (đổi ở Admin, không cần build lại; API bỏ URL không phải `https://*.supabase.co` và khoá dạng service_role), rồi mới tới biến build `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (công khai, dùng anon key, KHÔNG dùng service_role) đặt ở Vercel. Hook chờ hỏi cấu hình xong (kể cả lỗi) rồi mới nối. Cần đủ cả cặp từ cùng một nguồn; thiếu một
  trong hai thì tắt Realtime. CSP `connect-src` đã cho `https://*.supabase.co wss://*.supabase.co`. Cài trigger bên API:
  `yarn trigger:realtime-ping:set` (xem README Notification).
- **Nhịp tim (`heartbeat`):** pg_cron của DB phát sự kiện `heartbeat` (rỗng) lên CÙNG kênh mỗi 5 phút, chỉ khi trigger báo đơn
  đã cài và `realtime.send` chạy được — nên còn nhận nhịp tim là cả đường DB → Realtime → tab đang khoẻ. Trạng thái kênh:
  `connected` khi vừa SUBSCRIBED (kể cả nối lại), lên `live` khi nhận nhịp tim, quá 12 phút (`STAFF_ALERT_HEARTBEAT_STALE_MS`, lỡ 2
  nhịp + biên) không có nhịp mới thì về `connected`; kênh lỗi/đóng/ngắt thì `disconnected` và huỷ hẹn giờ. Nhịp tim KHÔNG gây
  refetch (không có gì đổi). Số trên menu và toast đơn mới vẫn cập nhật tức thì nhờ `staff-alert`; nhịp tim chỉ quyết định
  polling thưa tới đâu.
- **Polling dự phòng** (`orderLivePollInterval`): `useOrderLiveSummary` hỏi `getAdminOrderLiveSummary` mỗi 30 giây (tab ẩn 60 giây,
  quay lại tab hỏi ngay) khi Realtime không nối được; kênh `connected` (chưa có nhịp tim) thì 60 giây làm lưới an toàn — không
  thưa hơn vì lúc đó không phân biệt được "không có đơn" với "tín hiệu rơi âm thầm" (trigger chưa cài, `realtime.send` lỗi); kênh
  `live` thì 10 phút (`ORDER_LIVE_POLL_HEARTBEAT_MS`) chỉ để đối soát. Mỗi lần (nối lại) kênh cũng hỏi
  một lần vì tín hiệu lúc mất kết nối không được phát lại. Mọi nơi dùng chung một query key nên chỉ một vòng hỏi. Backend
  đếm theo phạm vi chi nhánh (`order.view`), không trả dữ liệu khách.
- Layout hiện số `pendingConfirmation` cạnh menu "Đơn hàng" và gắn `OrderLiveWatcher` cho người có `order.view`.
- `OrderLiveWatcher`: lần hỏi đầu chỉ lấy mốc `latestWebOrder.id`; id đổi thì toast "Có đơn hàng mới" (nút mở
  `/orders?orderNo=…&open=1`), tiếng "ting" (Web Audio), thông báo hệ điều hành khi tab ẩn và đã được cấp quyền, rồi invalidate
  danh sách đơn + KPI dashboard. Mỗi tab báo riêng; nhiều đơn giữa hai lần hỏi thì báo đơn mới nhất.
- Không dùng SSE từ API: API chạy serverless (Vercel) nên không giữ được kết nối dài; WebSocket đi thẳng tới Supabase. Telegram cho nhân viên do backend gửi (xem README Notification).

## Checklist khi sửa

- [ ] Giữ đủ loading/error/empty/search debounce/pagination/detail states.
- [ ] Thay đổi status group phải sửa Backend/OpenAPI trước rồi regenerate SDK.
- [ ] Không thay Order bằng checkout consultation hoặc fixture.
- [ ] Mọi action transition sau này phải có expected version, permission, audit và refetch/invalidate rõ.
- [ ] Cập nhật Storybook khi table/layout đổi đáng kể.

## Revision history

| Version | Date | Change summary | Source |
| --- | --- | --- | --- |
| 1.12.0 | 2026-11-26 | Nhịp tim `heartbeat` (pg_cron 5 phút) → trạng thái `live`; polling `live-summary` 10 phút khi `live`, 60 giây khi chỉ `connected`; `orderLivePollInterval` có unit test. | Realtime heartbeat |
| 1.11.0 | 2026-11-26 | Realtime (Supabase Broadcast) cho `live-summary` + hàng đợi thông báo, polling dự phòng; không báo job đồng bộ/phiếu hỗ trợ. | Realtime cho Admin |
| 1.10.0 | 2026-11-17 | Báo đơn mới bằng polling `live-summary`, badge menu, `OrderLiveWatcher`. | Thông báo đơn hàng cho CSKH |
| 1.9.0 | 2026-11-16 | `PosOrderDrawer` nạp lười qua barrel `@/features/pos`, giữ mounted sau lần mở đầu để giữ animation đóng và state. Props/open state không đổi. | perf/admin-quickwins |
| 1.8.0 | 2026-10-20 | Dòng đơn có nhãn "Giá flash sale" (`OrderItemDto.flashSale`) ở chi tiết đơn, hoá đơn in, biên lai POS — phân biệt dòng flash và dòng giá thường cùng sản phẩm. |  |
| 1.7.0 | 2026-10-17 | Huỷ sau giao thất bại (policy/hook/footer/hộp xác nhận + cảnh báo hoàn tay); tab chỉ-lọc `AWAITING_SHIPMENT`. | Dashboard KPI + failed-delivery review |
| 1.6.0 | 2026-10-13 | Tách drawer chi tiết thành thẻ con, mapper/policy có unit test; hiện giảm giá/thuế/ghi chú khách khi có; refetch chi tiết khi 409; báo lỗi khi sao chép mã thất bại. | Orders review |
| 1.5.0 | 2026-10-10 | `useUrlSearch`, page size 30 (`ADMIN_TABLE_DEFAULT_PAGE_SIZE`), `StatusTag`/tone, skeleton + `QueryErrorAlert`, `FormModal` cho xác nhận thao tác, nhãn người thao tác tiếng Việt. |
| 1.4.0 | 2026-09-19 | Pagination mặc định 20, chọn 20/50/100; refresh chuyển xuống dưới bảng và metric responsive đều cột. | Admin list UI review |
| 1.3.0 | 2026-09-13 | Thêm confirm Order và Fulfillment workflow/cache invalidation qua generated SDK. | DBAPI-20260913-FULFILLMENT-S43 |
| 1.2.0 | 2026-09-12 | Đổi copy và rule UI sang manual complete không giới hạn ngày sau DELIVERED/SUCCESS. | API-20260912-ORDER-GUEST-HARDENING |
| 1.1.1 | 2026-09-11 | Reset mutation/reason/idempotency khi đóng và thêm action confirmation stories. | ADMIN-20260911-ORDER-S41-HARDENING |
| 1.1.0 | 2026-09-11 | Thêm cancel/manual-complete transition UI qua generated SDK. | API-20260911-ORDER-OWN-ACCESS-TRANSITIONS |
| 1.0.0 | 2026-09-11 | Tạo Admin Order list/detail từ generated contract. | API-20260911-ORDER-FOUNDATION |
