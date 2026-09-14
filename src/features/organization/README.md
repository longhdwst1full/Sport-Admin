# Organization — maintenance note

> **Document version:** 1.0.0
>
> **Last updated:** 2026-09-13
>
> **Change summary:** Tạo note; branch và warehouse tạo/sửa cùng một thao tác.

## Phạm vi

Chi nhánh và kho: tạo, sửa, activate/deactivate.

## Ranh giới

`pages/organization-page.tsx` → `components/organization-form-drawer.tsx`.

## Generated operation

`useListAdminBranches`, `useListAdminWarehouses`, `useCreateAdminBranchWithWarehouse`, `useUpdateAdminBranchWithWarehouse`, `useActivateAdminBranchWithWarehouse`, `useDeactivateAdminBranchWithWarehouse` — `src/generated/api/organization`.

Tên operation có hậu tố `WithWarehouse`: **một chi nhánh luôn đi kèm kho chính**, không tạo rời.

## Ảnh hưởng lan rộng

Branch và warehouse là gốc của scope phân quyền, tồn kho và fulfillment. Deactivate một chi nhánh ảnh hưởng tới người dùng thuộc chi nhánh đó, tồn kho của kho đó và các fulfillment đang chạy.

## Checklist khi sửa

- [ ] Mutation gửi `expectedVersion`.
- [ ] Deactivate phải cảnh báo rõ hệ quả tới tồn kho và phân quyền.
- [ ] Không cho sửa kho của chi nhánh khác ngoài scope người dùng.


## Operation generated nhưng không gọi (RULE-CTR-06)

| Operation | Lý do |
| --- | --- |
| `deleteAdminBranchWithWarehouse` | Alias của `deactivateAdminBranchWithWarehouse`; nút **Ngừng** đã dùng bản `deactivate`. |

**Điều kiện gỡ ghi chú:** BE tách `DELETE` thành xoá cứng thật.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.0.0 | 2026-09-13 | Tạo note. |
