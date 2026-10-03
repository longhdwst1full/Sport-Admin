import { useState } from 'react';
import { DeleteOutlined, FileImageOutlined, PictureOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Image, Input, Select, Tag, Tooltip, Typography } from 'antd';
import { useDebounce } from 'use-debounce';
import { useCan } from '@/core/auth/permissions';
import { ManagementPage, StatusTag } from '@/foundation/management';
import { AdminTable } from '@/foundation/table';
import { useListAdminMediaAssets } from '@/generated/api/media/media';
import type { MediaAssetStatus, MediaAssetSummaryDto } from '@/generated/api/media/media.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { MediaAssetDrawer } from '../components/media-asset-drawer';
import {
  MEDIA_LIBRARY_PAGE_SIZE,
  MEDIA_PERMISSION,
  mediaStatusOptions,
  mediaStatusPresentation,
  IMAGE_FALLBACK_SRC,
} from '../constants/media-library.constants';
import { formatAssetSize } from '../model/media-format';

/** Thư viện ảnh (MED-02) và điểm vào xoá ảnh khỏi Cloudinary (MED-03). */
export function MediaLibraryPage() {
  const canManage = useCan(MEDIA_PERMISSION.MANAGE);
  const [pageSize, setPageSize] = useState(MEDIA_LIBRARY_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MediaAssetStatus>();
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [page, setPage] = useListPageReset([debouncedSearch, status, unusedOnly, pageSize]);

  const assets = useListAdminMediaAssets({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status,
    unusedOnly: unusedOnly || undefined,
  });
  const rows = assets.data?.items ?? [];
  const total = assets.data?.meta.total ?? 0;

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
        <div className="flex w-full flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="min-w-64 flex-1"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Public id, thư mục hoặc alt text"
          />
          <Select
            allowClear
            className="min-w-48"
            value={status}
            onChange={setStatus}
            placeholder="Đang lưu"
            options={mediaStatusOptions}
          />
          <Checkbox checked={unusedOnly} onChange={(event) => setUnusedOnly(event.target.checked)}>
            Chỉ ảnh không còn dùng
          </Checkbox>
          <Tooltip title="Làm mới dữ liệu">
            <Button
              aria-label="Làm mới"
              icon={<ReloadOutlined />}
              loading={assets.isFetching}
              onClick={() => void assets.refetch()}
            />
          </Tooltip>
        </div>
      }
    >
      {assets.isError && (
        <Alert
          className="mb-5"
          type="error"
          showIcon
          message="Không tải được thư viện ảnh"
          description={getApiErrorMessage(assets.error)}
          action={<Button onClick={() => void assets.refetch()}>Thử lại</Button>}
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
            setPage(nextPageSize === pageSize ? nextPage : 1);
            setPageSize(nextPageSize);
          },
        }}
        columns={[
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
                preview={false}
                className="rounded object-cover"
              />
            ),
          },
          {
            title: 'Public id',
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
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 190,
            render: (value: MediaAssetStatus) => <StatusTag status={value} presentations={mediaStatusPresentation} />,
          },
          { title: 'Người tải lên', dataIndex: 'uploadedByDisplayName', width: 170, render: (value: string | null) => value ?? '—' },
          { title: 'Ngày tải', dataIndex: 'createdAt', width: 170, render: formatDateTime },
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
        ]}
      />
      <MediaAssetDrawer assetId={selectedId} canManage={canManage} onClose={() => setSelectedId(undefined)} />
    </ManagementPage>
  );
}
