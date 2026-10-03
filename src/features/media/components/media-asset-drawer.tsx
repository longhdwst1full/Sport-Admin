import { useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { Alert, App, Button, Descriptions, Drawer, Empty, Image, Input, List, Skeleton, Tag, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { StatusTag } from '@/foundation/management';
import {
  getGetAdminMediaAssetQueryKey,
  getListAdminMediaAssetsQueryKey,
  useDeleteAdminMediaAsset,
  useGetAdminMediaAsset,
} from '@/generated/api/media/media';
import { getApiErrorMessage, getApiErrorPayload } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import {
  MEDIA_DELETE_REASON,
  MEDIA_ERROR_CODE,
  mediaStatusPresentation,
  mediaUsageLabels,
  IMAGE_FALLBACK_SRC,
} from '../constants/media-library.constants';
import { formatAssetSize } from '../model/media-format';

/**
 * Chi tiết một ảnh: nơi đang dùng và xoá khỏi Cloudinary.
 *
 * PERMISSION: nút xoá chỉ hiện khi có `media.asset.manage`; API vẫn kiểm lại quyền, trạng thái,
 * version và việc ảnh còn được dùng (409 MEDIA_ASSET_IN_USE kèm danh sách nơi dùng).
 */
export function MediaAssetDrawer({
  assetId,
  canManage,
  onClose,
}: {
  assetId?: string;
  canManage: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const asset = useGetAdminMediaAsset(assetId ?? '', { query: { enabled: Boolean(assetId) } });
  const data = asset.data;

  const remove = useDeleteAdminMediaAsset({
    mutation: {
      retry: false,
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListAdminMediaAssetsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetAdminMediaAssetQueryKey(assetId) }),
        ]);
        void message.success('Đã xoá ảnh khỏi Cloudinary.');
        setReason('');
        onClose();
      },
      onError: async (error) => {
        // Ảnh vừa được gắn ở nơi khác: tải lại để danh sách nơi dùng bên dưới hiện đúng.
        if (getApiErrorPayload(error)?.code === MEDIA_ERROR_CODE.IN_USE) {
          await queryClient.invalidateQueries({ queryKey: getGetAdminMediaAssetQueryKey(assetId) });
        }
        void message.error(getApiErrorMessage(error));
      },
    },
  });

  const trimmedReason = reason.trim();
  const deletable = Boolean(data && data.status === 'ACTIVE' && data.usageCount === 0);

  return (
    <Drawer
      open={Boolean(assetId)}
      onClose={() => {
        setReason('');
        onClose();
      }}
      width={560}
      title="Chi tiết ảnh"
      destroyOnHidden
    >
      {asset.isLoading && <Skeleton active />}
      {asset.isError && (
        <Alert type="error" showIcon message="Không tải được ảnh" description={getApiErrorMessage(asset.error)} />
      )}
      {data && (
        <div className="flex flex-col gap-5">
          <div className="flex justify-center rounded-lg bg-slate-50 p-3">
            <Image fallback={IMAGE_FALLBACK_SRC} src={data.secureUrl} alt={data.altText ?? data.publicId} className="max-h-72 object-contain" />
          </div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Trạng thái">
              <StatusTag status={data.status} presentations={mediaStatusPresentation} />
            </Descriptions.Item>
            <Descriptions.Item label="Public id">
              <Typography.Text copyable className="break-all">{data.publicId}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Kích thước">{formatAssetSize(data)}</Descriptions.Item>
            <Descriptions.Item label="Người tải lên">{data.uploadedByDisplayName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Ngày tải">{formatDateTime(data.createdAt)}</Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5} className="!mb-2">
              Đang được dùng ở {data.usages.length} nơi
            </Typography.Title>
            {data.usages.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không còn nơi nào dùng ảnh này" />
            ) : (
              <List
                size="small"
                bordered
                dataSource={data.usages}
                renderItem={(usage) => (
                  <List.Item>
                    <Tag>{mediaUsageLabels[usage.type]}</Tag>
                    <span className="flex-1 truncate" title={usage.label}>{usage.label}</span>
                    <span className="text-xs text-slate-400">#{usage.entityId}</span>
                  </List.Item>
                )}
              />
            )}
          </div>

          {canManage && data.status === 'ACTIVE' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
              <Typography.Text strong>Xoá ảnh khỏi Cloudinary</Typography.Text>
              <div className="mb-3 mt-1 text-xs text-slate-500">
                Không hoàn tác được. Lịch sử ảnh vẫn được giữ, nhưng ảnh sẽ không còn hiển thị ở bất kỳ đâu.
                {!deletable && ' Gỡ ảnh khỏi các nơi ở trên trước khi xoá.'}
              </div>
              <Input.TextArea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={MEDIA_DELETE_REASON.MAX}
                showCount
                rows={2}
                disabled={!deletable}
                placeholder="Lý do xoá (bắt buộc)"
              />
              <Button
                danger
                className="mt-3"
                icon={<DeleteOutlined />}
                disabled={!deletable || trimmedReason.length < MEDIA_DELETE_REASON.MIN}
                loading={remove.isPending}
                onClick={() =>
                  remove.mutate({ id: data.id, data: { expectedVersion: data.version, reason: trimmedReason } })
                }
              >
                Xoá ảnh
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
