import { ReloadOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

/** Nút làm mới dữ liệu của thanh lọc; truyền `query.refetch` và `query.isFetching`. */
export function RefreshButton({ onRefresh, loading }: { onRefresh: () => unknown; loading?: boolean }) {
  return (
    <Tooltip title="Làm mới dữ liệu">
      <Button icon={<ReloadOutlined />} onClick={() => void onRefresh()} loading={loading} aria-label="Làm mới" />
    </Tooltip>
  );
}
