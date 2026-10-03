import type { QueryClient, QueryKey } from '@tanstack/react-query';
import {
  getListAdminAttributesQueryKey,
  getListAdminBrandsQueryKey,
  getListAdminCategoriesQueryKey,
  getSearchActiveAdminBrandsQueryKey,
  getSearchActiveAdminCategoriesQueryKey,
} from '@/generated/api/catalog/catalog';
import {
  getListAdminAllRolesQueryKey,
  getListAdminPermissionsQueryKey,
  getListAdminRolesQueryKey,
  getSearchActiveAdminRolesQueryKey,
} from '@/generated/api/iam/iam';
import { getListAdminMediaAssetsQueryKey } from '@/generated/api/media/media';
import {
  getListAdminBranchesQueryKey,
  getListAdminWarehousesQueryKey,
  getSearchActiveAdminBranchesQueryKey,
  getSearchActiveAdminWarehousesQueryKey,
} from '@/generated/api/organization/organization';
import {
  getListShippingDistrictsQueryKey,
  getListShippingProvincesQueryKey,
  getListShippingWardsQueryKey,
} from '@/generated/api/shipping/shipping';
import {
  getListAdminSystemParametersQueryKey,
  getListSystemModulesQueryKey,
} from '@/generated/api/system/system';

/**
 * Thời gian coi dữ liệu còn tươi, theo tính chất dữ liệu chứ không theo màn hình.
 *
 * Mặc định của react-query là 0: mỗi lần component gắn lại là một lượt gọi mạng nữa. Với API và
 * database ở khác châu lục, mỗi lượt như vậy tốn gần nửa giây mà phần lớn trả về đúng dữ liệu cũ.
 *
 * Chia theo mức độ đổi của dữ liệu:
 * - REFERENCE: danh mục ít đổi (chi nhánh, kho, tỉnh/thành). Đổi thì cũng không ai cần thấy ngay.
 * - LOOKUP: danh mục nghiệp vụ đổi trong ngày (thương hiệu, danh mục hàng).
 * - Còn lại dùng mặc định 20 giây ở `query-client.ts` — danh sách đơn, tồn kho, báo cáo.
 */
export const CACHE_POLICY = {
  /** Danh mục hạ tầng: chi nhánh, kho, danh mục địa giới của hãng vận chuyển. */
  REFERENCE: { staleTime: 30 * 60_000, gcTime: 60 * 60_000 },
  /** Danh mục nghiệp vụ: thương hiệu, danh mục sản phẩm. */
  LOOKUP: { staleTime: 10 * 60_000, gcTime: 30 * 60_000 },
} as const;

interface ReferenceDataGroup {
  readonly policy: (typeof CACHE_POLICY)[keyof typeof CACHE_POLICY];
  /**
   * Tiền tố query key (Orval: phần tử đầu là URL), khớp mọi bộ tham số của cùng endpoint. Là hàm
   * để chỉ đọc SDK khi dùng tới — test `vi.mock` một module SDK không phải khai lại các hàm key này.
   */
  readonly queryKeys: () => readonly QueryKey[];
  /** operationId của mutation làm đổi nhóm này; mutation chạy qua hook Orval tự làm mới nhóm. */
  readonly mutations: readonly string[];
}

/**
 * Dữ liệu tham chiếu được cache lâu ở `query-client.ts`.
 *
 * INVARIANT: cache càng lâu thì càng phải làm mới đúng lúc. Mutation chạy qua hook Orval (có
 * `mutationKey`) được bắt tự động theo `mutations`; mutation gọi hàm API trực tiếp trong
 * `useMutation` tự viết thì phải gọi `invalidateReferenceData` khi thành công.
 *
 * Không đưa `/admin/auth/me` vào đây: quyền phải cập nhật khi người dùng quay lại tab
 * (`refetchOnWindowFocus` chỉ chạy khi dữ liệu đã cũ) và theo `permissionVersion`.
 */
export const REFERENCE_DATA = {
  brands: {
    policy: CACHE_POLICY.LOOKUP,
    queryKeys: () => [getListAdminBrandsQueryKey(), getSearchActiveAdminBrandsQueryKey()],
    mutations: ['createAdminBrand', 'updateAdminBrand', 'deleteAdminBrand', 'activateAdminBrand', 'deactivateAdminBrand'],
  },
  categories: {
    policy: CACHE_POLICY.LOOKUP,
    queryKeys: () => [getListAdminCategoriesQueryKey(), getSearchActiveAdminCategoriesQueryKey()],
    mutations: [
      'createAdminCategory',
      'updateAdminCategory',
      'deleteAdminCategory',
      'activateAdminCategory',
      'deactivateAdminCategory',
    ],
  },
  attributes: {
    policy: CACHE_POLICY.LOOKUP,
    queryKeys: () => [getListAdminAttributesQueryKey()],
    mutations: ['createAdminAttribute', 'updateAdminAttribute'],
  },
  organization: {
    policy: CACHE_POLICY.REFERENCE,
    queryKeys: () => [
      getListAdminBranchesQueryKey(),
      getListAdminWarehousesQueryKey(),
      getSearchActiveAdminBranchesQueryKey(),
      getSearchActiveAdminWarehousesQueryKey(),
    ],
    mutations: [
      'createAdminBranchWithWarehouse',
      'updateAdminBranchWithWarehouse',
      'deleteAdminBranchWithWarehouse',
      'activateAdminBranchWithWarehouse',
      'deactivateAdminBranchWithWarehouse',
    ],
  },
  roles: {
    policy: CACHE_POLICY.LOOKUP,
    queryKeys: () => [getListAdminRolesQueryKey(), getListAdminAllRolesQueryKey(), getSearchActiveAdminRolesQueryKey()],
    mutations: ['createAdminRole', 'updateAdminRole', 'deleteAdminRole'],
  },
  /** Danh mục quyền và module do code Backend định nghĩa; chỉ đổi khi deploy. */
  permissionCatalog: {
    policy: CACHE_POLICY.REFERENCE,
    queryKeys: () => [getListAdminPermissionsQueryKey(), getListSystemModulesQueryKey()],
    mutations: [],
  },
  systemParameters: {
    policy: CACHE_POLICY.LOOKUP,
    queryKeys: () => [getListAdminSystemParametersQueryKey()],
    mutations: ['createAdminSystemParameter', 'updateAdminSystemParameter', 'deleteAdminSystemParameter'],
  },
  shippingAreas: {
    policy: CACHE_POLICY.REFERENCE,
    queryKeys: () => [getListShippingProvincesQueryKey(), getListShippingDistrictsQueryKey(), getListShippingWardsQueryKey()],
    mutations: [],
  },
  /**
   * Thư viện media trong picker. Tải ảnh qua `uploadImage` gọi hàm API trực tiếp (không có
   * mutationKey) nên `useImageUpload` tự làm mới nhóm này khi tải xong.
   */
  media: {
    policy: CACHE_POLICY.LOOKUP,
    queryKeys: () => [getListAdminMediaAssetsQueryKey()],
    // Xoá ảnh khỏi sản phẩm xoá luôn asset trên Cloudinary và trong thư viện.
    mutations: ['deleteAdminMediaAsset', 'finalizeAdminMediaUpload', 'deleteAdminProductMedia'],
  },
} as const satisfies Record<string, ReferenceDataGroup>;

export type ReferenceDataName = keyof typeof REFERENCE_DATA;

/** Đánh dấu cũ mọi biến thể (mọi tham số) của một nhóm dữ liệu tham chiếu; query đang hiển thị tải lại ngay. */
export async function invalidateReferenceData(queryClient: QueryClient, name: ReferenceDataName): Promise<void> {
  await Promise.all(
    REFERENCE_DATA[name].queryKeys().map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
