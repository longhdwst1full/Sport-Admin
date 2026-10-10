# Organization — maintenance note

> **Document version:** 1.2.0
>
> **Last updated:** 2026-10-10
>
> **Change summary:** Thêm thanh lọc (tìm + trạng thái, lọc tại chỗ, nằm trên URL) và nút làm mới; trạng thái dùng tone chuẩn.

## Phạm vi

Chi nhánh và kho: tạo, sửa, activate/deactivate; khai danh sách quận/huyện chi nhánh tự giao miễn phí.

## Ranh giới

`pages/organization-page.tsx` → `components/organization-form-drawer.tsx`. Dòng bảng dựng ở `model/branch-warehouse.mapper.ts`; nhãn trạng thái và bộ quyền quản lý ở `constants/organization.constants.ts`.

Dùng chung cho feature khác (qua barrel): `components/branch-select.tsx` (`BranchSelect`, lookup chi nhánh
ACTIVE, queryKey `['organization','branch-lookup']`) và `hooks/use-branch-labels.ts` (`useBranchLabels`, tra
tên từ `branchId`, chi nhánh ngoài lookup hiện `#<id>`).

## Generated operation

`useListAdminBranches`, `useListAdminWarehouses`, `useCreateAdminBranchWithWarehouse`, `useUpdateAdminBranchWithWarehouse`, `useActivateAdminBranchWithWarehouse`, `useDeactivateAdminBranchWithWarehouse` — `src/generated/api/organization`.

Tên operation có hậu tố `WithWarehouse`: **một chi nhánh luôn đi kèm kho chính**, không tạo rời.

## Ảnh hưởng lan rộng

Branch và warehouse là gốc của scope phân quyền, tồn kho và fulfillment. Deactivate một chi nhánh ảnh hưởng tới người dùng thuộc chi nhánh đó, tồn kho của kho đó và các fulfillment đang chạy.

## Miễn phí nội khu (D62)

- `organization-form-drawer` thêm field "Quận/huyện giao miễn phí", dùng lại cặp hook
  `useListShippingProvinces`/`useListShippingDistricts` đã có cho địa chỉ chi nhánh — không tạo cơ chế
  chọn quận thứ hai. Yup validate khớp server: mã là chuỗi số, tối đa 100 phần tử.
- **CONTRACT:** payload luôn gửi tường minh `freeDeliveryDistrictCodes` (kể cả mảng rỗng). Bỏ trống
  field này ở API nghĩa là "giữ nguyên" — nếu form omit thì Admin không bao giờ xoá được danh sách.
- Mã đã chọn thuộc tỉnh khác tỉnh đang lọc vẫn được giữ, để đổi bộ lọc tỉnh không âm thầm mất lựa chọn.
- Backend đọc mảng này ở `shipping/free-delivery.policy.ts`; khớp quận → báo giá `BRANCH_FREE` không
  gọi GHN.

## Checklist khi sửa

- [ ] Mutation gửi `expectedVersion`.
- [ ] Deactivate phải cảnh báo rõ hệ quả tới tồn kho và phân quyền.
- [ ] Không cho sửa kho của chi nhánh khác ngoài scope người dùng.
- [ ] Sửa field `freeDeliveryDistrictCodes` phải luôn gửi tường minh (kể cả rỗng), không omit.


## Operation generated nhưng không gọi (RULE-CTR-06)

| Operation | Lý do |
| --- | --- |
| `deleteAdminBranchWithWarehouse` | Alias của `deactivateAdminBranchWithWarehouse`; nút **Ngừng** đã dùng bản `deactivate`. |

**Điều kiện gỡ ghi chú:** BE tách `DELETE` thành xoá cứng thật.

## Revision history

| Version | Date | Change summary |
| --- | --- | --- |
| 1.2.0 | 2026-10-10 | Thêm thanh lọc (tìm + trạng thái, lọc tại chỗ, nằm trên URL) và nút làm mới; trạng thái dùng tone chuẩn. |
| 1.1.0 | 2026-09-27 | Thêm cấu hình "Quận/huyện giao miễn phí" (D62). |
| 1.0.0 | 2026-09-13 | Tạo note. |
