// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AdminTable, TableSurfaceProvider } from '@/foundation/table';
import { DetailDrawer } from './detail-drawer';

describe('DetailDrawer cung cấp surface embedded', () => {
  beforeAll(() => {
    // jsdom không có matchMedia; antd Table/Grid cần.
    window.matchMedia ??= ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(cleanup);
  it('bảng trong drawer mở từ màn page không bị ép cao', () => {
    render(
      <TableSurfaceProvider value="page">
        <DetailDrawer open getContainer={false} title="Chi tiết" onClose={() => undefined}>
          <AdminTable
            rowKey="id"
            columns={[{ title: 'Tên', dataIndex: 'name' }]}
            dataSource={[{ id: '1', name: 'A' }]}
            pagination={false}
          />
        </DetailDrawer>
      </TableSurfaceProvider>,
    );
    expect(document.querySelector('.ant-table')).not.toBeNull();
    expect(document.querySelector('.admin-table-fill')).toBeNull();
  });
});
