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
  LOOKUP: { staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
} as const;
