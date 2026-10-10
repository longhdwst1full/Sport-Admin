# Notifications Admin

Version: 1.1.0 — 2026-10-10

## Phạm vi

- Danh sách outbox email theo phân trang, tìm kiếm và trạng thái từ API generated.
- Hiển thị metadata vận hành đã được Backend che người nhận; không đọc payload email.
- Cho người có `system.parameter.manage` đưa bản ghi `DEAD` trở lại hàng đợi.

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

