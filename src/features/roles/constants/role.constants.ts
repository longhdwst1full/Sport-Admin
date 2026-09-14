/** Nhãn tiếng Việt cho module quyền. Mã quyền do API quyết định, nhãn chỉ để hiển thị. */
export const permissionModuleLabels: Record<string, string> = {
  System: 'Hệ thống',
  Organization: 'Chi nhánh & kho',
  IAM: 'Người dùng & vai trò',
  Customer: 'Khách hàng',
  Catalog: 'Sản phẩm',
  Pricing: 'Giá & khuyến mãi',
  Review: 'Đánh giá',
  Inventory: 'Tồn kho',
  Order: 'Đơn hàng',
  Payment: 'Thanh toán',
  Fulfillment: 'Giao hàng',
  Return: 'Đổi trả',
  CMS: 'Nội dung',
  Media: 'Thư viện ảnh',
  Reporting: 'Báo cáo',
};

export const permissionActionLabels: Record<string, string> = {
  view: 'Xem',
  manage: 'Quản lý',
  create: 'Tạo',
  publish: 'Xuất bản',
  adjust: 'Điều chỉnh',
  ship: 'Xuất kho',
  receive: 'Nhận',
  pick: 'Lấy hàng',
  pack: 'Đóng gói',
  delivery_update: 'Cập nhật giao hàng',
  confirm: 'Xác nhận',
  decide: 'Duyệt',
  moderate: 'Kiểm duyệt',
  upload: 'Tải lên',
};

export function permissionLabel(module: string, action: string): string {
  return `${permissionActionLabels[action] ?? action} · ${permissionModuleLabels[module] ?? module}`;
}
