# Notifications Admin

Version: 1.2.0 — 2026-10-17

## Phạm vi

Route `/notifications` (menu "Thông báo email", quyền `system.parameter.view`) có hai màn con, chọn bằng
`Segmented` ở header và lưu trên URL `?tab=` (`queue` mặc định, `templates`).

### Hàng đợi gửi (`components/notification-queue-view.tsx`)

- Danh sách outbox email theo phân trang, tìm kiếm và trạng thái từ API generated.
- Hiển thị metadata vận hành đã được Backend che người nhận; không đọc payload email.
- Cho người có `system.parameter.manage` đưa bản ghi `DEAD` trở lại hàng đợi.

### Mẫu email (`components/email-templates-view.tsx`, `?tab=templates`)

- 13 thẻ theo sự kiện email gửi khách: tên, khi nào gửi, tag "Mặc định"/"Đã tuỳ chỉnh", tiêu đề đang áp dụng.
- Drawer `xl` (`email-template-drawer.tsx`): trái = form RHF + yup (Tiêu đề `Input`, Đoạn mở đầu
  `RichTextEditor variant="email"`, nút "Chèn biến" chèn `{{name}}` vào ô vừa focus — editor qua `handleRef.insertText`,
  ô tiêu đề qua `insertAtSelection`), phải = xem trước trực tiếp (iframe `sandbox=""`, Máy tính 680px / Điện thoại 375px,
  tab bản chữ thuần). Footer: Gửi thử (popover, email trống = email tài khoản), Khôi phục mặc định (confirm), Huỷ/Lưu.
- Generated: `useListAdminEmailTemplates`, `useUpdateAdminEmailTemplate`, `previewAdminEmailTemplate` (chạy trong
  `useQuery` debounce 500 ms, AbortSignal huỷ lượt cũ), `useSendAdminEmailTemplateTest`.
- Mapping ở `model/email-template.mapper.ts` (row, form, payload lưu/khôi phục, chèn biến); mẫu chữ thuần cũ được
  đổi sang HTML khi mở form.
- PERMISSION: sửa/lưu/gửi thử cần `system.parameter.manage` (API còn đòi phạm vi GLOBAL); chỉ có quyền xem thì drawer
  ở chế độ xem + xem trước.
- CONCURRENCY: lưu gửi `subjectVersion` + `introVersion`; 409 → invalidate danh sách, giữ nội dung đang soạn, báo người
  dùng bấm Lưu lần nữa để ghi đè. Tham số chưa đồng bộ (version null) → không cho lưu.
- CACHE: lưu thành công invalidate `getListAdminEmailTemplatesQueryKey()` và `getListAdminSystemParametersQueryKey()`.
- Khôi phục mặc định = lưu rỗng cả hai trường (ngữ nghĩa API). Màn "Tham số hệ thống" không còn sửa `EMAIL_*`,
  chỉ trỏ link sang đây.

## Boundary và state owner

- Backend sở hữu retry, backoff, dead-letter, masking và audit.
- React Query sở hữu server state; ô tìm (`q`), trạng thái và trang nằm trên URL; kích thước trang là local UI state.
- Contract chỉ được thay đổi từ NestJS OpenAPI rồi regenerate. Không sửa `src/generated/api`.
- Cron secret và endpoint maintenance nội bộ không được đưa vào trình duyệt.

## Checklist khi sửa

- Giữ list server-side và page size mặc định 30.
- Mutation requeue phải tắt retry phía FE và invalidate toàn bộ list prefix.
- Chỉ render requeue cho `DEAD` và khi có quyền quản lý.
- Không hiển thị payload, email đầy đủ, token hoặc provider secret.
- Cập nhật Storybook cho loading, empty và trạng thái lỗi nghiệp vụ.
- Mẫu email: không tự render HTML preview ngoài iframe sandbox; không thêm biến ngoài danh sách API trả về;
  giữ `RichTextEditor` lazy (không import `rich-text-editor-implementation` trực tiếp).
- Test: `model/email-template.mapper.test.ts`.

