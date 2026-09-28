/**
 * Khoá idempotency theo nội dung lệnh: bấm lại (hoặc retry sau lỗi mạng) với cùng nội dung thì
 * dùng lại key cũ để API trả kết quả cũ; đổi nội dung thì sinh key mới, tránh bị API coi là
 * xung đột (`03-transitions-idempotency.md`: cùng key + cùng payload → cùng kết quả, cùng key +
 * payload khác → conflict).
 *
 * Sống ở `shared` vì lệnh order/payment/fulfillment/return đều cần cùng cách sinh key, không
 * riêng gì `returns`.
 */
export function nextIdempotencyKey(
  previous: { signature: string; key: string } | undefined,
  signature: string,
  generate: () => string = () => crypto.randomUUID(),
): { signature: string; key: string } {
  return previous?.signature === signature ? previous : { signature, key: generate() };
}
