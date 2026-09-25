/**
 * Chuẩn hoá giá nhập ở màn tạo để gửi kèm lệnh tạo sản phẩm (`variants[].initialPriceAmount`).
 *
 * API tạo sản phẩm, SKU, giá và ảnh trong một transaction, nên không còn phải ghép giá với SKU thật
 * sau khi tạo. Ô giá không bắt buộc: trống, 0 hoặc không phải số thì bỏ qua thay vì gửi lên để nhận lỗi.
 */
export function toInitialPriceAmount(price?: string): string | undefined {
  const amount = price?.trim();
  if (!amount) return undefined;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return String(Math.trunc(parsed));
}
