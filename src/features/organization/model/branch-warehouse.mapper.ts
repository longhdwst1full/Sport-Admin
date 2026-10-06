import type {
  BranchDto,
  OrganizationStatus,
  WarehouseDto,
} from '@/generated/api/organization/organization.schemas';

export interface BranchWarehouseRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  warehouseCode: string;
  warehouseName: string;
  address: string;
  region: string;
  status: OrganizationStatus;
  branch: BranchDto;
  warehouse?: WarehouseDto;
}

/** V1: mỗi chi nhánh có đúng một kho; chi nhánh chưa có kho vẫn hiện để admin thấy thiếu liên kết. */
export function toBranchWarehouseRows(
  branches: BranchDto[],
  warehouses: WarehouseDto[],
): BranchWarehouseRow[] {
  return branches.map((branch) => {
    const warehouse = warehouses.find((item) => item.branchId === branch.id);
    return {
      branchId: branch.id,
      branchCode: branch.code,
      branchName: branch.name,
      warehouseCode: warehouse?.code ?? 'Chưa liên kết',
      warehouseName: warehouse?.name ?? 'Chưa có kho',
      address: [branch.address.addressLine, branch.address.district, branch.address.province].join(
        ', ',
      ),
      region: branch.address.province,
      status: branch.status,
      branch,
      warehouse,
    };
  });
}
