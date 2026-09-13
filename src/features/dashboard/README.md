# Dashboard — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note.

## Phạm vi

Trang chủ sau đăng nhập: danh sách module hệ thống người dùng được phép vào.

## Ranh giới

`pages/dashboard-page.tsx` → `components/system-module-list.tsx`.

## Generated operation

`useListSystemModules` — `src/generated/api/system`. Danh sách module do **backend** quyết theo permission; FE không tự dựng menu cứng.

## Checklist khi sửa

- [ ] Không hardcode danh sách module; luôn đọc từ API.
- [ ] Không thêm biểu đồ/thư viện nặng khi chưa có yêu cầu đo được (`07-state-tools-performance.md`).
- [ ] Có skeleton khớp bố cục khi tải lần đầu (`12-skeleton-loading.md`).

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note. |
