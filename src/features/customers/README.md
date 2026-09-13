# Customers — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note; gắn nhãn non-production vì màn hình đang chạy fixture.

## Phạm vi

Danh sách và chi tiết khách hàng.

## ⚠ Trạng thái: NON-PRODUCTION

`pages/customers-page.tsx` đọc `model/customers.fixture.ts` — **dữ liệu giả, không gọi API**.

Nguyên nhân: chưa có operation `Admin Customers` nào trong `src/generated/api`. Backend có model `Customer`/`CustomerAddress` nhưng chưa expose controller admin.

Đây là task backend (`RULE-CTR-02`): không tự chế endpoint hay DTO ở FE để lấp.

## Khi backend sẵn sàng

1. Thêm controller `Admin Customers` trong `api/`.
2. `yarn contracts:sync && yarn generate:api`.
3. Thay fixture bằng hook generated, xoá `model/customers.fixture.ts`.
4. Bổ sung đủ loading/empty/error/permission states.

## Checklist khi sửa

- [ ] Không mở rộng fixture như thể là tính năng thật.
- [ ] Không hiển thị PII giả lẫn với dữ liệu thật.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note, gắn nhãn fixture. |
