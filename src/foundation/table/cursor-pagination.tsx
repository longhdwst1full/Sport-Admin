import { LeftOutlined, RightOutlined, VerticalRightOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

/**
 * Thanh phân trang cho danh sách dùng con trỏ (keyset), không có tổng số dòng.
 *
 * Sổ chuyển động kho và phiếu điều chỉnh chỉ ghi thêm, không bao giờ xoá: `COUNT(*)` trên chúng
 * chậm dần theo thời gian, và phân trang theo offset còn trượt dòng khi có bản ghi mới chen vào
 * giữa lúc người dùng đang lật trang. Vì vậy hai màn đó không có số trang để bấm.
 *
 * Thanh này vì thế không giả vờ có số trang. Nó chỉ nói đang ở trang thứ mấy và còn trang sau hay
 * không, nhưng đặt cùng vị trí, cùng kiểu chữ với phân trang đánh số ở các tab khác để không lạc
 * lõng giữa cùng một màn hình.
 */
export function CursorPagination({
  pageIndex,
  rowCount,
  hasPrevious,
  hasNext,
  loading,
  totalLabel = 'dòng',
  onFirst,
  onPrevious,
  onNext,
}: {
  /** Bắt đầu từ 0. */
  pageIndex: number;
  rowCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading?: boolean;
  totalLabel?: string;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm text-slate-500">
      <span>
        Trang {pageIndex + 1} · {rowCount} {totalLabel}
      </span>
      <div className="flex items-center gap-1">
        <Tooltip title="Về trang đầu">
          <Button
            size="small"
            type="text"
            icon={<VerticalRightOutlined />}
            disabled={!hasPrevious || loading}
            aria-label="Về trang đầu"
            onClick={onFirst}
          />
        </Tooltip>
        <Button
          size="small"
          icon={<LeftOutlined />}
          disabled={!hasPrevious || loading}
          aria-label="Trang trước"
          onClick={onPrevious}
        />
        <Button
          size="small"
          icon={<RightOutlined />}
          disabled={!hasNext || loading}
          aria-label="Trang sau"
          onClick={onNext}
        />
      </div>
    </div>
  );
}
