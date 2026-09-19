# Admin table foundation

> **Document version:** 1.1.0
>
> **Last updated:** 2026-09-19
>
> **Change summary:** Đổi pagination mặc định thành 30 dòng và mở lựa chọn 10/20/30/50/100.

## Trách nhiệm

- `AdminTable` là wrapper duy nhất quanh Ant Design `Table` cho bảng nghiệp vụ.
- Cột không khai báo `width` nhận mặc định `160px`; width do feature khai báo luôn được giữ nguyên.
- Horizontal scroll luôn bật; feature có thể truyền `scroll.x` cụ thể khi đã biết tổng width.
- Pagination mặc định 30 dòng và có lựa chọn 10/20/30/50/100; server pagination của feature vẫn là nguồn dữ liệu chính.
- Double-click một ô dữ liệu sẽ copy nội dung text của ô. Không render icon copy trong table.
- `TableActionButton` và `TableActions` chuẩn hóa action icon-only, tooltip và `aria-label`.

## Biên sở hữu

- Foundation sở hữu layout, accessibility và interaction trung lập domain.
- Feature sở hữu columns, DTO/view model, permission, confirm, mutation và server query.
- Không đưa generated DTO hoặc business status vào `src/foundation/table`.

## Checklist khi sửa

- [ ] Không import trực tiếp Ant Design `Table` ở feature mới; dùng `AdminTable`.
- [ ] Cột action ghim phải, có width cố định và chỉ hiển thị icon.
- [ ] Action icon có label tiếng Việt để tạo tooltip và `aria-label`.
- [ ] Destructive action vẫn phải có confirm ở feature.
- [ ] Test `withFixedColumnWidths`, build production và build Storybook.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.1.0 | 2026-09-19 | Mặc định 30 dòng, bổ sung lựa chọn số dòng/trang 10/20/30/50/100. |
| 1.0.0 | 2026-09-19 | Tạo foundation table theo pattern table/action-cell của admin-client, giữ Ant Design và TanStack Query hiện tại. |
