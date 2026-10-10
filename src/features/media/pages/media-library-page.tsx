import { useMemo, useState } from 'react';
import { DeleteOutlined, FileImageOutlined, PictureOutlined } from '@ant-design/icons';
import { Button, Checkbox, Image, Select, Tag, Tooltip, Typography } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { ManagementPage } from '@/foundation/management';
import { SearchInput } from '@/foundation/inputs/search-input';
import type { ColumnsType } from 'antd/es/table';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, AdminTable, col, FilterBar, RefreshButton } from '@/foundation/table';
import { useListAdminMediaAssets } from '@/generated/api/media/media';
import { MediaAssetStatus, type MediaAssetSummaryDto } from '@/generated/api/media/media.schemas';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { MediaAssetDrawer } from '../components/media-asset-drawer';
import {
  MEDIA_PERMISSION,
  mediaStatusOptions,
  mediaStatusPresentation,
  IMAGE_FALLBACK_SRC,
} from '../constants/media-library.constants';
import { formatAssetSize } from '../model/media-format';

const SEARCH_KEYS = ['search'] as const;

/** Cột dữ liệu của thư viện ảnh; cột xoá ghép trong component vì phụ thuộc quyền. */
const MEDIA_COLUMNS: ColumnsType<MediaAssetSummaryDto> = [
  {
    title: 'Ảnh',
    key: 'preview',
    width: 88,
    fixed: 'left',
    render: (_value, row) => (
      <Image
        fallback={IMAGE_FALLBACK_SRC}
        src={row.thumbnailUrl}
        alt={row.altText ?? row.publicId}
        width={56}
        height={56}
        loading="lazy"
        preview={false}
        className="rounded object-cover"
      />
    ),
  },
  {
    title: 'Mã công khai',
    dataIndex: 'publicId',
    width: 320,
    render: (value: string, row) => (
      <div className="min-w-0">
        <Typography.Text className="break-all">{value}</Typography.Text>
        {row.altText && <div className="text-xs text-slate-500">{row.altText}</div>}
      </div>
    ),
  },
  { title: 'Kích thước', key: 'size', width: 170, render: (_value, row) => formatAssetSize(row) },
  {
    title: 'Đang dùng',
    dataIndex: 'usageCount',
    width: 120,
    render: (value: number) => (value > 0 ? <Tag color="blue">{value} nơi</Tag> : <Tag>Không dùng</Tag>),
  },
  col.status<MediaAssetSummaryDto, MediaAssetStatus>('status', 'Trạng thái', mediaStatusPresentation, { width: 190 }),
  col.text<MediaAssetSummaryDto>('uploadedByDisplayName', 'Người tải lên', { width: 170 }),
  col.dateTime<MediaAssetSummaryDto>('createdAt', 'Ngày tải', { width: 170 }),
];

/** Thư viện ảnh (MED-02) và điểm vào xoá ảnh khỏi Cloudinary (MED-03). */
export function MediaLibraryPage() {
  const canManage = useCan(MEDIA_PERMISSION.MANAGE);
  // Lọc/trang nằm trên URL (`search`, `status`, `unused`, `page`) để F5/Back/gửi link giữ nguyên.
  const search = useUrlSearch(SEARCH_KEYS);
  const { url } = search;
  const status = url.getEnum('status', MediaAssetStatus);
  const unusedOnly = url.get('unused') === '1';
  const page = url.getNumber('page', 1);
  const [pageSize, setPageSize] = useState(ADMIN_TABLE_DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string>();

  const assets = useListAdminMediaAssets({
    page,
    limit: pageSize,
    search: url.get('search'),
    status,
    unusedOnly: unusedOnly || undefined,
  });
  const rows = assets.data?.items ?? [];
  const total = assets.data?.meta.total ?? 0;
  const columns = useMemo<ColumnsType<MediaAssetSummaryDto>>(
    () => [
      ...MEDIA_COLUMNS,
      {
        title: '',
        key: 'actions',
        width: 72,
        fixed: 'right',
        render: (_value, row) =>
          canManage && row.status === 'ACTIVE' && row.usageCount === 0 ? (
            <Tooltip title="Xoá ảnh">
              <Button
                type="text"
                danger
                aria-label="Xoá ảnh"
                icon={<DeleteOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(row.id);
                }}
              />
            </Tooltip>
          ) : null,
      },
    ],
    [canManage],
  );

  return (
    <ManagementPage
      eyebrow="Media"
      title="Thư viện ảnh"
      description="Tất cả ảnh đã tải lên Cloudinary, nơi đang dùng từng ảnh và xoá ảnh không còn dùng."
      metrics={[
        { key: 'total', label: 'Kết quả phù hợp', value: total, icon: <PictureOutlined />, tone: 'blue' },
        {
          key: 'unused',
          label: 'Không còn dùng trên trang',
          value: rows.filter((row) => row.usageCount === 0 && row.status === 'ACTIVE').length,
          icon: <FileImageOutlined />,
          tone: 'orange',
        },
      ]}
      filters={
        <FilterBar actions={<RefreshButton onRefresh={assets.refetch} loading={assets.isFetching} />}>
          <SearchInput
            className="min-w-64 flex-1"
            value={search.values.search}
            onChange={search.setter('search')}
            placeholder="Mã công khai, thư mục hoặc mô tả ảnh"
          />
          <Select
            allowClear
            className="min-w-48"
            value={status}
            onChange={(value?: MediaAssetStatus) => url.patch({ status: value, page: undefined })}
            placeholder="Đang lưu"
            options={mediaStatusOptions}
          />
          <Checkbox checked={unusedOnly} onChange={(event) => url.patch({ unused: event.target.checked ? '1' : undefined, page: undefined })}>
            Chỉ ảnh không còn dùng
          </Checkbox>
        </FilterBar>
      }
    >
      {assets.isError && (
        <QueryErrorAlert
          error={assets.error}
          message="Không tải được thư viện ảnh"
          retry={() => void assets.refetch()}
        />
      )}
      <AdminTable<MediaAssetSummaryDto>
        rowKey="id"
        dataSource={rows}
        loading={assets.isLoading || assets.isFetching}
        emptyEntity="ảnh"
        onRow={(row) => ({ onClick: () => setSelectedId(row.id), className: 'cursor-pointer' })}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (value) => `${value} ảnh`,
          onChange: (nextPage, nextPageSize) => {
            url.set('page', nextPageSize === pageSize && nextPage > 1 ? nextPage : undefined);
            setPageSize(nextPageSize);
          },
        }}
        columns={columns}
      />
      <MediaAssetDrawer assetId={selectedId} canManage={canManage} onClose={() => setSelectedId(undefined)} />
    </ManagementPage>
  );
}
