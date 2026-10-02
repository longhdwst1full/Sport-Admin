import { useState } from 'react';
import { CheckCircleFilled, PlayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Empty, Image, Input, Modal, Pagination, Skeleton, Typography, Upload } from 'antd';
import { useDebounce } from 'use-debounce';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { useListAdminMediaAssets } from '@/generated/api/media/media';
import type { MediaAssetSummaryDto } from '@/generated/api/media/media.schemas';
import { uploadImage } from '@/lib/media/upload-image';
import { useImageUpload } from '@/shared/hooks/use-image-upload';

const PICKER_PAGE_SIZE = 24;

export type PickedMediaKind = 'IMAGE' | 'VIDEO';

export interface PickedMediaAsset {
  id: string;
  url: string;
  kind: PickedMediaKind;
}

const kindOf = (asset: Pick<MediaAssetSummaryDto, 'mimeType'>): PickedMediaKind =>
  asset.mimeType?.startsWith('video/') ? 'VIDEO' : 'IMAGE';

/**
 * Chọn nhiều media ACTIVE từ Thư viện ảnh (kèm tải ảnh mới lên ngay trong modal).
 *
 * `allowedKinds` lọc thứ được chọn (ví dụ bài Video chỉ nhận video); media khác loại vẫn hiện nhưng
 * khoá, để người dùng không tưởng thư viện trống. Chọn theo thứ tự bấm; `max` chặn chọn thêm.
 * PERMISSION: danh sách cần `media.asset.view`, tải lên cần `media.asset.upload`; API kiểm lại.
 */
export function MediaLibraryPickerModal({
  open,
  max,
  allowedKinds,
  initialSelected = [],
  onCancel,
  onConfirm,
}: {
  open: boolean;
  max: number;
  allowedKinds: readonly PickedMediaKind[];
  initialSelected?: PickedMediaAsset[];
  onCancel: () => void;
  onConfirm: (selected: PickedMediaAsset[]) => void;
}) {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PickedMediaAsset[]>(initialSelected);
  const canUpload = useCan('media.asset.upload');
  const { uploading, customRequest } = useImageUpload(uploadImage);

  const assets = useListAdminMediaAssets(
    { page, limit: PICKER_PAGE_SIZE, search: debouncedSearch || undefined },
    { query: { enabled: open, retry: false } },
  );
  const items = assets.data?.items ?? [];

  const toggle = (asset: PickedMediaAsset) => {
    setSelected((current) => {
      if (current.some((item) => item.id === asset.id)) return current.filter((item) => item.id !== asset.id);
      if (current.length >= max) {
        void message.warning(`Chỉ chọn được tối đa ${max} media.`);
        return current;
      }
      return [...current, asset];
    });
  };

  return (
    <Modal
      open={open}
      width={880}
      title="Chọn từ Thư viện ảnh"
      okText={`Chọn (${selected.length}/${max})`}
      cancelText="Huỷ"
      onCancel={onCancel}
      onOk={() => onConfirm(selected)}
      destroyOnHidden
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Input.Search
          allowClear
          className="min-w-64 flex-1"
          value={search}
          maxLength={100}
          placeholder="Tìm theo public id, thư mục hoặc alt text"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {allowedKinds.includes('IMAGE') && (
          <Upload
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            showUploadList={false}
            disabled={uploading || !canUpload}
            customRequest={(options) =>
              customRequest(options, {
                onSuccess: (asset) => {
                  void assets.refetch();
                  toggle({ id: asset.id, url: asset.secureUrl, kind: 'IMAGE' });
                },
                onError: (error) => void message.error(error.message),
              })
            }
          >
            <Button icon={<UploadOutlined />} loading={uploading} disabled={!canUpload}>
              Tải ảnh lên
            </Button>
          </Upload>
        )}
      </div>
      <Typography.Paragraph type="secondary" className="!mb-3 text-xs">
        Thứ tự bấm chọn là thứ tự hiển thị trên Facebook.
      </Typography.Paragraph>
      {assets.isError && (
        <QueryErrorAlert error={assets.error} message="Không tải được thư viện ảnh" retry={() => void assets.refetch()} />
      )}
      {assets.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : items.length === 0 ? (
        <Empty description="Không có media phù hợp." />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {items.map((asset) => {
            const kind = kindOf(asset);
            const allowed = allowedKinds.includes(kind);
            const order = selected.findIndex((item) => item.id === asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                disabled={!allowed}
                aria-pressed={order >= 0}
                aria-label={`Chọn ${asset.publicId}`}
                title={allowed ? asset.publicId : 'Loại media này không dùng được cho kiểu đăng đã chọn'}
                onClick={() => toggle({ id: asset.id, url: asset.thumbnailUrl ?? asset.secureUrl, kind })}
                className={`relative overflow-hidden rounded-lg border-2 bg-slate-50 ${
                  order >= 0 ? 'border-blue-500' : 'border-transparent'
                } ${allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
              >
                <Image preview={false} width="100%" height={96} src={asset.thumbnailUrl} className="object-cover" />
                {kind === 'VIDEO' && (
                  <PlayCircleOutlined className="absolute left-1 top-1 rounded-full bg-black/50 p-1 text-white" />
                )}
                {order >= 0 && (
                  <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-blue-500 px-1.5 text-[11px] font-bold text-white">
                    <CheckCircleFilled /> {order + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <Pagination
          size="small"
          current={page}
          pageSize={PICKER_PAGE_SIZE}
          total={assets.data?.meta.total ?? 0}
          showSizeChanger={false}
          onChange={setPage}
        />
      </div>
    </Modal>
  );
}
