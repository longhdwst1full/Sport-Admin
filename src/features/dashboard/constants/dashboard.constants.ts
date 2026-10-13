import {
  getExportAdminReportInventoryQueryKey,
  getExportAdminReportRevenueByBranchQueryKey,
  getExportAdminReportRevenueQueryKey,
  getExportAdminReportTopCustomersQueryKey,
  getExportAdminReportTopProductsQueryKey,
} from '@/generated/api/reporting/reporting';
import type { ReportGranularity } from '@/generated/api/reporting/reporting.schemas';

export type Granularity = ReportGranularity;

export const GRANULARITY_OPTIONS: ReadonlyArray<{ value: Granularity; label: string }> = [
  { value: 'DAY', label: 'Ngày' },
  { value: 'MONTH', label: 'Tháng' },
  { value: 'QUARTER', label: 'Quý' },
  { value: 'YEAR', label: 'Năm' },
];

/**
 * Khoảng thời gian mặc định theo mức gom.
 *
 * Backend mặc định 30 ngày gần nhất; gom theo quý hoặc năm trên 30 ngày chỉ cho đúng một cột, nên
 * mỗi mức tự nới khoảng đủ để biểu đồ có ý nghĩa.
 */
export const LOOKBACK_DAYS: Record<Granularity, number> = {
  DAY: 30,
  MONTH: 365,
  QUARTER: 730,
  YEAR: 1826,
};

export const PERIOD_DESCRIPTION: Record<Granularity, string> = {
  DAY: '30 ngày gần nhất',
  MONTH: '12 tháng gần nhất',
  QUARTER: '8 quý gần nhất',
  YEAR: '5 năm gần nhất',
};

/** Màn hình chỉ hiện top 5; file tải về lấy mức tối đa Backend cho phép (`@Max(50)`). */
export const TOP_LIST_LIMIT = 5;
export const TOP_LIST_EXPORT_LIMIT = 50;

/** Báo cáo tổng quan luôn tính trên 30 ngày (Backend `DEFAULT_RANGE_DAYS`), không theo bộ chọn kỳ. */
export const OVERVIEW_PERIOD = '30 ngày gần nhất';

/**
 * Bảng màu phân loại, thứ tự cố định — không bao giờ xoay vòng sang màu thứ 7.
 *
 * Bảng cũ (`#059669,#0ea5e9,#8b5cf6,#f59e0b,#ef4444,#ec4899`) trượt kiểm tra: cặp hồng/đỏ cạnh nhau
 * chỉ cách ΔE 11.4 với mắt thường (ngưỡng 15), và hai màu xanh/cam dưới 3:1 tương phản với nền.
 * Đặt ở đây (không import `recharts`) để chú giải HTML dùng chung màu mà không kéo thư viện đồ thị.
 */
export const CHART_COLORS = [
  '#047857',
  '#0284c7',
  '#a16207',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
] as const;
/** Số lát tối đa của biểu đồ tròn; phần còn lại gộp thành "Khác" để không lặp màu. */
export const MAX_STATUS_SLICES = CHART_COLORS.length;

/**
 * CONTRACT: Endpoint tải báo cáo. SDK sinh không có hàm dựng URL, còn hàm `export*` trả Blob nên mất
 * `Content-Disposition` (tên file); `ReportExportButton` cần đường dẫn để tải qua `downloadFile`.
 * Phần tử đầu của query key sinh ra chính là đường dẫn endpoint, nên đọc từ đó thay vì viết tay —
 * contract đổi đường dẫn thì regenerate là đủ.
 */
export const REPORT_EXPORT_PATH = {
  revenue: getExportAdminReportRevenueQueryKey()[0],
  revenueByBranch: getExportAdminReportRevenueByBranchQueryKey()[0],
  inventory: getExportAdminReportInventoryQueryKey()[0],
  topProducts: getExportAdminReportTopProductsQueryKey()[0],
  topCustomers: getExportAdminReportTopCustomersQueryKey()[0],
} as const;

/** PERMISSION: lý do thẻ trống khi thiếu quyền; UI chỉ không gọi API, Backend vẫn là nơi chặn. */
export const DENIED_TEXT = {
  revenue: 'Tài khoản của bạn không có quyền xem doanh thu',
  operation: 'Tài khoản của bạn không có quyền xem vận hành',
} as const;
