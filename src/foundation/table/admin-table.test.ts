import { describe, expect, it } from 'vitest';
import type { ColumnsType } from 'antd/es/table';
import {
  ADMIN_TABLE_BODY_HEIGHT,
  ADMIN_TABLE_DEFAULT_PAGE_SIZE,
  ADMIN_TABLE_PAGE_SIZE_OPTIONS,
  withFixedColumnWidths,
} from './table-config';

interface DemoRow {
  id: string;
  name: string;
}

describe('withFixedColumnWidths', () => {
  it('preserves explicit widths and fills missing widths recursively', () => {
    const columns: ColumnsType<DemoRow> = [
      { key: 'id', dataIndex: 'id', width: 90 },
      { key: 'name', dataIndex: 'name' },
      { key: 'group', title: 'Nhóm', children: [{ key: 'nested', dataIndex: 'name' }] },
    ];

    const result = withFixedColumnWidths(columns, 180);

    expect(result?.[0]?.width).toBe(90);
    expect(result?.[1]?.width).toBe(180);
    expect(result?.[2] && 'children' in result[2] ? result[2].children?.[0]?.width : null).toBe(180);
  });

  it('keeps the shared pagination default and selectable page sizes aligned', () => {
    expect(ADMIN_TABLE_DEFAULT_PAGE_SIZE).toBe(30);
    expect(ADMIN_TABLE_PAGE_SIZE_OPTIONS).toContain(String(ADMIN_TABLE_DEFAULT_PAGE_SIZE));
    // Bỏ mức 10: bảng cao hết màn hình hiển thị được hơn hai chục dòng, chọn 10 chỉ tạo thêm
    // lượt lật trang cho một khoảng trống lớn bên dưới.
    expect(ADMIN_TABLE_PAGE_SIZE_OPTIONS).toEqual(['20', '30', '50', '100']);
  });
});

describe('chiều cao thân bảng', () => {
  it('chỉ trừ đi phần bố cục quanh bảng, phần còn lại là viewport', () => {
    expect(ADMIN_TABLE_BODY_HEIGHT).toBe('calc(100vh - var(--admin-table-offset, 340px))');
  });

  /**
   * Màn nào có thêm hàng thẻ số liệu hoặc bộ lọc cao hơn thì đặt lại biến này trên vùng bao ngoài
   * bảng, thay vì truyền `scroll.y` khác nhau ở từng chỗ gọi.
   */
  it('cho phép màn hình đặt lại khoảng trừ bằng biến CSS', () => {
    expect(ADMIN_TABLE_BODY_HEIGHT).toContain('--admin-table-offset');
  });
});

