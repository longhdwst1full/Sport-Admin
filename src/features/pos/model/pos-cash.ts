/**
 * Tiền thối cho khách trả tiền mặt.
 *
 * Chỉ phục vụ hiển thị tại quầy: số tiền khách đưa không gửi lên Backend, vì đơn chỉ ghi nhận
 * đã thu đủ hay chưa. Ghi nhận được nhiều hơn tổng đơn sẽ thành một khoản thu không có gốc.
 */
export function changeFor(total: number, received: number | null | undefined): number | null {
  if (received == null || !Number.isFinite(received)) return null;
  if (received < total) return null;
  return received - total;
}

/** Thiếu bao nhiêu so với tổng đơn; null khi đã đủ hoặc chưa nhập. */
export function shortfallFor(total: number, received: number | null | undefined): number | null {
  if (received == null || !Number.isFinite(received)) return null;
  if (received >= total) return null;
  return total - received;
}
