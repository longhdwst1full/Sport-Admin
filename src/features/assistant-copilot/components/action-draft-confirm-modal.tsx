import { Alert, Descriptions, Modal, Typography } from 'antd';
import { formatQuantityDelta } from '../model/action-draft.policy';
import { actionDraftErrorMessage } from '../model/copilot-error';
import type { StockAdjustmentDraft } from '../model/copilot.types';

/**
 * Nhắc lại hệ quả trước khi xác nhận (`04-permissions-transitions.md`): lệnh tạo phiếu điều chỉnh tồn thật,
 * chạy bằng tài khoản của người bấm, ghi vào sổ kho và không huỷ được bằng nút Từ chối.
 * Modal chỉ đóng khi lệnh thành công; lỗi giữ modal mở kèm thông điệp.
 */
export function ActionDraftConfirmModal({
  draft,
  open,
  submitting,
  error,
  onConfirm,
  onClose,
}: {
  draft: StockAdjustmentDraft;
  open: boolean;
  submitting: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const increase = draft.delta > 0;
  return (
    <Modal
      open={open}
      title="Xác nhận điều chỉnh tồn kho"
      okText="Xác nhận điều chỉnh"
      cancelText="Quay lại"
      okButtonProps={{ danger: !increase }}
      confirmLoading={submitting}
      onOk={onConfirm}
      onCancel={onClose}
      destroyOnHidden
    >
      <Descriptions size="small" column={1} bordered className="mb-3">
        <Descriptions.Item label="Chi nhánh">{draft.branchName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Kho">{draft.warehouseCode}</Descriptions.Item>
        <Descriptions.Item label="SKU">
          <span className="font-mono">{draft.sku}</span>
          <span className="text-slate-500"> — {draft.productName}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Tồn hiện tại">{draft.currentOnHand}</Descriptions.Item>
        <Descriptions.Item label="Tồn sau điều chỉnh">{draft.requestedOnHand}</Descriptions.Item>
        <Descriptions.Item label="Chênh lệch">
          <strong className={increase ? 'text-emerald-700' : 'text-rose-700'}>{formatQuantityDelta(draft.delta)}</strong>
        </Descriptions.Item>
        <Descriptions.Item label="Lý do">{draft.reason}</Descriptions.Item>
      </Descriptions>
      <Typography.Paragraph>
        Hệ thống sẽ tạo <strong>phiếu điều chỉnh tồn</strong> bằng tài khoản của bạn: tồn của SKU{' '}
        <span className="font-mono">{draft.sku}</span> tại kho {draft.warehouseCode} đổi từ{' '}
        <strong>{draft.currentOnHand}</strong> thành <strong>{draft.requestedOnHand}</strong> ngay lập tức và được ghi vào sổ kho.
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        Không hoàn tác được bằng nút Từ chối; muốn đảo lại phải lập phiếu điều chỉnh ngược. Nếu tồn thực tế đã khác{' '}
        {draft.currentOnHand}, hệ thống sẽ từ chối để tránh điều chỉnh sai.
      </Typography.Paragraph>
      {Boolean(error) && (
        <Alert type="error" showIcon message="Không thực hiện được" description={actionDraftErrorMessage(error)} />
      )}
    </Modal>
  );
}
