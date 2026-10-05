import { useEffect } from 'react';
import { App, Descriptions, Form, Input, Modal, Typography } from 'antd';
import { StatusTag } from '@/foundation/management';
import type { BannerDto } from '@/generated/api/content/content.schemas';
import { BANNER_LIMITS, bannerPlacementLabels, bannerStatusPresentation } from '../constants/banner.constants';
import { useSetBannerStatus } from '../hooks/use-banner-commands';
import { BANNER_ACTION_TARGET, type BannerAction } from '../model/banner-actions.policy';
import { bannerCommandErrorMessage } from '../model/banner-command-error';

const ACTION_META: Record<
  BannerAction,
  { title: string; okText: string; consequence: string; reasonRequired: boolean; danger?: boolean }
> = {
  publish: {
    title: 'Xuất bản banner',
    okText: 'Xuất bản',
    consequence: 'Banner hiển thị trên storefront khi nằm trong khung thời gian đã đặt.',
    reasonRequired: false,
  },
  unpublish: {
    title: 'Gỡ banner về nháp',
    okText: 'Gỡ xuống',
    consequence: 'Banner ngừng hiển thị ngay trên storefront; có thể xuất bản lại sau.',
    reasonRequired: true,
  },
  archive: {
    title: 'Lưu trữ banner',
    okText: 'Lưu trữ',
    consequence: 'Lưu trữ là trạng thái cuối: banner không hiển thị, không sửa hay xuất bản lại được nữa.',
    reasonRequired: true,
    danger: true,
  },
};

/**
 * Xác nhận đổi trạng thái: hiện trạng thái hiện tại, hành động và hệ quả (`04-permissions-transitions.md`).
 * UX: gỡ xuống/lưu trữ bắt buộc lý do (ghi audit); xuất bản lý do tuỳ chọn. Modal chỉ đóng khi thành công.
 * CONCURRENCY: `banner` lấy từ danh sách hiện tại, nên sau lỗi stale (danh sách tự tải lại) bấm lại
 * dùng version mới.
 */
export function BannerStatusModal({
  banner,
  action,
  onClose,
}: {
  banner?: BannerDto;
  action?: BannerAction;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ reason?: string }>();
  const setStatus = useSetBannerStatus();
  const { reset } = setStatus;

  useEffect(() => {
    if (!action) return;
    form.resetFields();
    reset();
  }, [action, banner?.id, form, reset]);

  if (!banner || !action) return null;
  const meta = ACTION_META[action];

  const submit = ({ reason }: { reason?: string }) => {
    setStatus.mutate(
      {
        id: banner.id,
        body: {
          expectedVersion: banner.version,
          status: BANNER_ACTION_TARGET[action],
          reason: reason?.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          void message.success(`${meta.okText} banner thành công`);
          onClose();
        },
        onError: (error) => {
          void message.error(bannerCommandErrorMessage(error));
        },
      },
    );
  };

  return (
    <Modal
      open
      title={meta.title}
      okText={meta.okText}
      cancelText="Huỷ"
      okButtonProps={{ danger: meta.danger }}
      confirmLoading={setStatus.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Descriptions size="small" column={1} className="mb-3">
        <Descriptions.Item label="Banner">{banner.title || banner.code}</Descriptions.Item>
        <Descriptions.Item label="Vị trí">{bannerPlacementLabels[banner.placement]}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái hiện tại">
          <StatusTag status={banner.status} presentations={bannerStatusPresentation} />
        </Descriptions.Item>
      </Descriptions>
      <Typography.Paragraph type="secondary">{meta.consequence}</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit} disabled={setStatus.isPending}>
        <Form.Item
          name="reason"
          label="Lý do"
          rules={meta.reasonRequired ? [{ required: true, whitespace: true, message: 'Nhập lý do (ghi vào nhật ký)' }] : []}
        >
          <Input.TextArea rows={3} maxLength={BANNER_LIMITS.REASON_MAX} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
