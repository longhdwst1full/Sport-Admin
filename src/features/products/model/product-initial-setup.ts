/**
 * Cùng regex với `CreateProductVariantDto.initialPriceAmount` của API: số thập phân ≤ 2 chữ số lẻ và
 * lớn hơn 0. Không đi qua `Number` — `0.5` từng bị cắt thành `"0"`, còn số lớn thành `1e+21`, và API
 * từ chối cả lệnh tạo.
 */
export const INITIAL_PRICE_PATTERN = /^(?=.*[1-9])\d+(?:\.\d{1,2})?$/;

/**
 * Chuẩn hoá giá nhập ở màn tạo để gửi kèm lệnh tạo sản phẩm (`variants[].initialPriceAmount`).
 *
 * Ô giá không bắt buộc: trống thì bỏ qua. Giá sai định dạng đã bị form chặn bằng
 * `INITIAL_PRICE_PATTERN`; hàm này chỉ không gửi giá trị mà API chắc chắn từ chối.
 */
export function toInitialPriceAmount(price?: string): string | undefined {
  const amount = price?.trim();
  return amount && INITIAL_PRICE_PATTERN.test(amount) ? amount : undefined;
}
