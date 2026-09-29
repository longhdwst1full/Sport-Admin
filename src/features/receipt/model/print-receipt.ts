import { RECEIPT_PRINTING_BODY_CLASS } from '../constants/receipt.constants';

/**
 * In riêng biên lai: CSS `@media print` chỉ hiện `.print-receipt-root` khi body có class này.
 * Gỡ class ở `afterprint` (và ngay sau `print()` cho trình duyệt in đồng bộ) để lần in sau không dính.
 */
export function printOrderReceipt(): void {
  const { body } = document;
  const cleanup = () => {
    body.classList.remove(RECEIPT_PRINTING_BODY_CLASS);
    window.removeEventListener('afterprint', cleanup);
  };
  body.classList.add(RECEIPT_PRINTING_BODY_CLASS);
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Chrome/Firefox chặn tới khi đóng hộp thoại in; Safari trả về ngay nên còn lại afterprint lo.
  setTimeout(cleanup, 1000);
}
