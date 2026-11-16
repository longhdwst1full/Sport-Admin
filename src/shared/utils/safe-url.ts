/**
 * SECURITY: URL nhận từ API/đối tác (phiếu giao của hãng vận chuyển, trang uỷ quyền OAuth) trước khi gán
 * imperatively vào `location`/`window.open`. React 19 chỉ chặn `javascript:` trong thuộc tính JSX, không chặn
 * `location.href = …`; tab trống mở bằng `window.open('')` lại cùng origin Admin và CSP còn `'unsafe-inline'`,
 * nên một URL `javascript:`/`data:` lọt vào đây sẽ chạy script trên origin Admin. Chỉ nhận http(s) tuyệt đối.
 */
export function toSafeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
}
