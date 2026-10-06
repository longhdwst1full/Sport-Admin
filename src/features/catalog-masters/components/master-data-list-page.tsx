import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import { Button, Popconfirm } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { PermissionGate, useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { PageTransition } from '@/foundation/layout/page-transition';
import { ManagementPage, type ManagementMetric } from '@/foundation/management';
import {
  AdminTable,
  FilterBar,
  RefreshButton,
  TableActionButton,
  col,
} from '@/foundation/table';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { filterCatalogMasters, type SearchableCatalogMaster } from '../model/catalog-masters.mapper';
import { MASTER_STATUSES } from '../constants/catalog-masters.constants';

/** Cột mã dạng chip, chung cho Thương hiệu và Danh mục. */
function masterCodeColumn<T>(): ColumnType<T> {
  return {
    title: 'Mã',
    dataIndex: 'code',
    width: 140,
    render: (value: string) => (
      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
        {value}
      </span>
    ),
  };
}

export interface MasterDataRow extends SearchableCatalogMaster {
  id: string;
  status: string;
  version: number;
}

interface MasterDataListQuery<T> {
  data?: { items: T[]; total: number };
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

export interface MasterDataListPageProps<T extends MasterDataRow> {
  title: string;
  description: string;
  /** Tên thực thể viết thường, dùng trong nhãn nút/xác nhận (ví dụ `thương hiệu`). */
  entity: string;
  permission: string;
  totalMetric: Pick<ManagementMetric, 'key' | 'label' | 'icon' | 'tone'>;
  activeMetric: Pick<ManagementMetric, 'key' | 'label'>;
  query: MasterDataListQuery<T>;
  /** Cột riêng của từng màn, nằm giữa cột mã và cột trạng thái. */
  columns: ColumnType<T>[];
  scrollX: number;
  toggleDescription: string;
  onToggleStatus: (row: T) => void;
  deleteConfirm: { title: string; description: string; okText?: string };
  onDelete: (row: T) => void;
  deletingId?: string;
  renderDrawer: (props: { open: boolean; selected?: T; onClose: () => void }) => ReactNode;
}

/**
 * Khung chung của màn Thương hiệu và Danh mục: cùng thanh lọc client-side, cùng chỉ số, cùng bộ thao
 * tác sửa / bật-tắt / xoá. Màn gọi giữ mutation và cột riêng.
 */
export function MasterDataListPage<T extends MasterDataRow>({
  title,
  description,
  entity,
  permission,
  totalMetric,
  activeMetric,
  query,
  columns,
  scrollX,
  toggleDescription,
  onToggleStatus,
  deleteConfirm,
  onDelete,
  deletingId,
  renderDrawer,
}: MasterDataListPageProps<T>) {
  const search = useSearchState('', 250);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<T>();

  const items = query.data?.items;
  const rows = useMemo(
    () => filterCatalogMasters(items ?? [], search.debounced ?? ''),
    [items, search.debounced],
  );
  const activeCount = (items ?? []).filter((row) => row.status === 'ACTIVE').length;

  const openDrawer = useCallback((row?: T) => {
    setSelected(row);
    setDrawerOpen(true);
  }, []);

  const canManage = useCan(permission);
  const tableColumns = useMemo<ColumnsType<T>>(
    () => [
      masterCodeColumn<T>(),
      ...columns,
      // CONTRACT: T mở rộng MasterDataRow nên luôn có khoá `status`.
      col.status<T, keyof typeof MASTER_STATUSES>('status' as Extract<keyof T, string>, 'Trạng thái', MASTER_STATUSES),
      col.actions<T>(
        (row) =>
          canManage ? (
            <>
              <TableActionButton
                label={`Sửa ${entity} ${row.name}`}
                icon={<EditOutlined />}
                onClick={() => openDrawer(row)}
              />
              <Popconfirm
                title={row.status === 'ACTIVE' ? `Ngừng ${entity}?` : `Kích hoạt ${entity}?`}
                description={toggleDescription}
                onConfirm={() => onToggleStatus(row)}
              >
                <TableActionButton
                  label={row.status === 'ACTIVE' ? `Ngừng ${entity}` : `Kích hoạt ${entity}`}
                  danger={row.status === 'ACTIVE'}
                  icon={<PoweroffOutlined />}
                />
              </Popconfirm>
              <Popconfirm
                title={deleteConfirm.title}
                description={deleteConfirm.description}
                okText={deleteConfirm.okText}
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(row)}
              >
                <TableActionButton
                  label={`Xóa ${entity} ${row.name}`}
                  danger
                  icon={<DeleteOutlined />}
                  loading={deletingId === row.id}
                />
              </Popconfirm>
            </>
          ) : null,
        { title: '', width: 130, fixed: undefined },
      ),
    ],
    [canManage, columns, deleteConfirm, deletingId, entity, onDelete, onToggleStatus, openDrawer, toggleDescription],
  );

  return (
    <PageTransition>
      <ManagementPage
        eyebrow="Dữ liệu danh mục gốc"
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap gap-2">
            <RefreshButton onRefresh={query.refetch} loading={query.isFetching} />
            <PermissionGate permission={permission}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                Thêm {entity}
              </Button>
            </PermissionGate>
          </div>
        }
        metrics={[
          { ...totalMetric, value: query.data?.total ?? 0 },
          { ...activeMetric, value: activeCount, icon: <CheckCircleOutlined />, tone: 'green' },
        ]}
        filters={
          <FilterBar>
            <SearchInput
              value={search.value}
              onChange={search.setValue}
              placeholder="Tìm theo mã, tên hoặc slug..."
            />
          </FilterBar>
        }
      >
        {query.isError ? (
          <QueryErrorAlert error={query.error} retry={() => void query.refetch()} />
        ) : (
          <AdminTable<T>
            rowKey="id"
            loading={query.isPending}
            dataSource={rows}
            scroll={{ x: scrollX }}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            columns={tableColumns}
          />
        )}

        {renderDrawer({ open: drawerOpen, selected, onClose: () => setDrawerOpen(false) })}
      </ManagementPage>
    </PageTransition>
  );
}
