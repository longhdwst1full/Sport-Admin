/**
 * Nhãn/tone trạng thái đơn dùng chung cho `orders`, `payments`, `customers`, `dashboard`.
 * Tách khỏi `orders` vì `orders` phụ thuộc `payments`; payments cần nhãn đơn mà không được import ngược.
 */
export { orderStatusPresentation } from './constants/order-status.constants';
