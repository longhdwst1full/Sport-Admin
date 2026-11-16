// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { Drawer } from 'antd';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AdminTable } from './admin-table';
import { TableSurfaceProvider } from './table-surface';

const columns = [{ title: 'Tên', dataIndex: 'name' }];
const dataSource = [{ id: '1', name: 'A' }];
const fill = () => document.querySelector('.admin-table-fill');

function table() {
  return <AdminTable rowKey="id" columns={columns} dataSource={dataSource} pagination={false} />;
}

describe('AdminTable surface', () => {
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

  it('bảng ở ngữ cảnh page cao hết màn', () => {
    render(<TableSurfaceProvider value="page">{table()}</TableSurfaceProvider>);
    expect(fill()).not.toBeNull();
  });

  it('bảng trong overlay đã khai embedded không bị ép cao dù ngoài là page', () => {
    render(
      <TableSurfaceProvider value="page">
        <Drawer open getContainer={false}>
          <TableSurfaceProvider value="embedded">{table()}</TableSurfaceProvider>
        </Drawer>
      </TableSurfaceProvider>,
    );
    expect(document.querySelector('.ant-table')).not.toBeNull();
    expect(fill()).toBeNull();
  });

  it('fallback: drawer antd thô dưới ngữ cảnh page vẫn ra embedded nhờ dò DOM', () => {
    render(
      <TableSurfaceProvider value="page">
        <Drawer open getContainer={false}>
          {table()}
        </Drawer>
      </TableSurfaceProvider>,
    );
    expect(document.querySelector('.ant-table')).not.toBeNull();
    expect(fill()).toBeNull();
  });
});
