# Admin table foundation

> **Document version:** 1.3.0
>
> **Last updated:** 2026-10-06
>
> **Change summary:** Bảng chính của `ManagementPage` lấp phần còn lại của màn hình (chỉ thân bảng cuộn, pager luôn hiện); thêm preset cột `col.*`, `useColumnVisibility`, `RefreshButton`, `FilterBar`. Trước đó: Mọi ô của `AdminTable` giới hạn 3 dòng, dài hơn cắt bằng "…" (rê chuột xem đủ với ô chữ thuần; double-click vẫn copy toàn văn). Cột tự khai `ellipsis` giữ hành vi antd. Trước đó: Đổi pagination mặc định thành 30 dòng và mở lựa chọn 10/20/30/50/100.

## Trách nhiệm

- `AdminTable` là wrapper duy nhất quanh Ant Design `Table` cho bảng nghiệp vụ.
- Cột không khai báo `width` nhận mặc định `160px`; width do feature khai báo luôn được giữ nguyên.
- Horizontal scroll luôn bật; feature có thể truyền `scroll.x` cụ thể khi đã biết tổng width.
- Pagination mặc định 30 dòng và có lựa chọn 10/20/30/50/100; server pagination của feature vẫn là nguồn dữ liệu chính.
- Double-click một ô dữ liệu sẽ copy nội dung text của ô. Không render icon copy trong table.
- `TableActionButton` và `TableActions` chuẩn hóa action icon-only, tooltip và `aria-label`.

## Preset và hook

- `col.text | number | money | date | dateTime | status | actions` — cột chuẩn (căn lề, width, ô trống `—`, định dạng); tham số cuối ghi đè mọi thuộc tính antd.
- `useColumnVisibility(items)` — state ẩn/hiện cột cho `ColumnSettingsModal`; `apply(columns)` lọc theo `key`.
- `FilterBar` — bố cục prop `filters` của `ManagementPage` (lọc trái, hành động phải); `RefreshButton` — nút làm mới có tooltip/aria-label.
- Bảng là con trực tiếp của vùng nội dung `ManagementPage` (`.dctd-fill`) thì tự lấp chiều cao; bọc thêm lớp thì thêm `dctd-fill flex min-h-0 flex-1 flex-col` vào lớp bọc để nối chuỗi.

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
| 1.3.0 | 2026-10-06 | Bảng chính lấp chiều cao màn (chỉ thân bảng cuộn); preset cột `col.*`, `useColumnVisibility`, `RefreshButton`, `FilterBar`; sửa khe trống do padding ép vào hàng đo ẩn. |
| 1.2.0 | 2026-10-02 | Mọi ô của `AdminTable` giới hạn 3 dòng, dài hơn cắt bằng "…" (rê chuột xem đủ với ô chữ thuần; double-click vẫn copy toàn văn). Cột tự khai `ellipsis` giữ hành vi antd. |
| 1.1.0 | 2026-09-19 | Mặc định 30 dòng, bổ sung lựa chọn số dòng/trang 10/20/30/50/100. |
| 1.0.0 | 2026-09-19 | Tạo foundation table theo pattern table/action-cell của admin-client, giữ Ant Design và TanStack Query hiện tại. |
