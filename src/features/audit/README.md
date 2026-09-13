# Audit — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note.

## Phạm vi

Tra cứu nhật ký audit, chỉ đọc.

## Generated operation

`useListAdminAuditLogs` — `src/generated/api/audit`.

## Bất biến

Audit log là **append-only**: không sửa, không xoá, không có API cho việc đó. Màn hình này vĩnh viễn chỉ đọc.

## Checklist khi sửa

- [ ] Không thêm hành động ghi/xoá.
- [ ] Filter/paging chạy server-side, không tải toàn bộ log về lọc ở client.
- [ ] Không hiển thị dữ liệu nhạy cảm chưa redact trong payload log.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note. |
