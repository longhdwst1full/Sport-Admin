import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Modal, Skeleton, Space, Tooltip, Typography } from 'antd';
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { usePermissions } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { formatDateTime } from '@/lib/format/datetime';
import { actionDraftStatusPresentation, COPILOT_LIMITS } from '../constants/copilot.constants';
import { useActionDraft, useActionDraftCommand, useNow } from '../hooks/use-action-draft';
import {
  actionDraftAffordances,
  askAgainPrompt,
  formatQuantityDelta,
  formatRemaining,
} from '../model/action-draft.policy';
import { actionDraftErrorMessage, actionDraftFailureMessage } from '../model/copilot-error';
import type { StockAdjustmentDraft } from '../model/copilot.types';
import { ActionDraftConfirmModal } from './action-draft-confirm-modal';

/** Thẻ bản nháp theo id: tải trạng thái hiện tại rồi hiển thị. */
export function ActionDraftCard({ draftId, onAskAgain }: { draftId: string; onAskAgain: (prompt: string) => void }) {
  const query = useActionDraft(draftId);
  if (query.isPending) {
    return <Card size="small" className="!mt-2 !rounded-lg"><Skeleton active paragraph={{ rows: 3 }} /></Card>;
  }
  if (query.isError || !query.data) {
    return (
      <Alert
        className="!mt-2"
        type="error"
        showIcon
        message="Không tải được bản nháp"
        description={actionDraftErrorMessage(query.error)}
        action={<Button size="small" onClick={() => void query.refetch()}>Thử lại</Button>}
      />
    );
  }
  return <ActionDraftCardBody draft={query.data} refetch={query.refetch} onAskAgain={onAskAgain} />;
}

/**
 * Bản nháp điều chỉnh tồn (STOCK_ADJUSTMENT) do trợ lý lập. Trợ lý không bao giờ tự ghi: chỉ khi nhân viên
 * bấm Xác nhận, API mới điều chỉnh tồn bằng principal của chính người bấm.
 */
function ActionDraftCardBody({
  draft,
  refetch,
  onAskAgain,
}: {
  draft: StockAdjustmentDraft;
  /** Tham chiếu ổn định (`query.refetch`) vì dùng trong dependency của effect hết hạn. */
  refetch: () => Promise<unknown>;
  onAskAgain: (prompt: string) => void;
}) {
  const permissions = usePermissions();
  const command = useActionDraftCommand(draft);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const now = useNow(draft.status === 'PENDING');
  const affordances = actionDraftAffordances(draft, permissions, now);
  const remaining = formatRemaining(Date.parse(draft.expiresAt) - now);
  const expiredLocally = draft.status === 'PENDING' && affordances.status === 'EXPIRED';

  // Hết hạn trên đồng hồ máy: đọc lại một lần để API đánh dấu và trả trạng thái chính thức.
  useEffect(() => {
    if (expiredLocally) void refetch();
  }, [expiredLocally, refetch]);

  const trimmedReason = rejectReason.trim();
  const reasonInvalid = trimmedReason.length > 0 && trimmedReason.length < COPILOT_LIMITS.REJECT_REASON_MIN;
  const increase = draft.delta > 0;
  const modalOpen = confirmOpen || rejectOpen;

  return (
    <Card
      size="small"
      className="!mt-2 !rounded-lg !border-amber-300"
      title="Bản nháp điều chỉnh tồn kho"
      extra={<StatusTag status={affordances.status} presentations={actionDraftStatusPresentation} />}
    >
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Chi nhánh">{draft.branchName ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Kho">{draft.warehouseCode}</Descriptions.Item>
        <Descriptions.Item label="SKU">
          <span className="font-mono">{draft.sku}</span>
          <span className="text-slate-500"> — {draft.productName}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Hiện tại">{draft.currentOnHand}</Descriptions.Item>
        <Descriptions.Item label="Yêu cầu">{draft.requestedOnHand}</Descriptions.Item>
        <Descriptions.Item label="Chênh lệch">
          <strong className={increase ? 'text-emerald-700' : 'text-rose-700'}>{formatQuantityDelta(draft.delta)}</strong>
        </Descriptions.Item>
        <Descriptions.Item label="Lý do">{draft.reason}</Descriptions.Item>
        {affordances.status === 'PENDING' && remaining && (
          <Descriptions.Item label="Hết hạn sau">
            <span className="font-mono"><ClockCircleOutlined /> {remaining}</span>
          </Descriptions.Item>
        )}
      </Descriptions>

      {affordances.status === 'EXECUTED' && (
        <Alert
          type="success"
          showIcon
          message={draft.resultRef ? `Đã tạo phiếu điều chỉnh ${draft.resultRef}` : 'Đã điều chỉnh tồn'}
          description={draft.executedAt ? `Lúc ${formatDateTime(draft.executedAt)}` : undefined}
        />
      )}
      {affordances.status === 'CONFIRMED' && (
        <Alert
          type="info"
          showIcon
          message="Đang thực hiện điều chỉnh"
          action={<Button size="small" icon={<ReloadOutlined />} onClick={() => void refetch()}>Tải lại</Button>}
        />
      )}
      {affordances.status === 'FAILED' && (
        <Alert type="error" showIcon message="Điều chỉnh không thành công" description={actionDraftFailureMessage(draft.errorCode)} />
      )}
      {affordances.status === 'REJECTED' && (
        <Typography.Text type="secondary">Bản nháp đã bị từ chối; tồn kho không thay đổi.</Typography.Text>
      )}
      {affordances.status === 'EXPIRED' && (
        <Typography.Text type="secondary">Bản nháp đã hết hạn; tồn kho không thay đổi.</Typography.Text>
      )}
      {affordances.status === 'PENDING' && affordances.confirmBlockedReason && (
        <Alert type="warning" showIcon className="!mb-2" message={affordances.confirmBlockedReason} />
      )}
      {Boolean(command.error) && !modalOpen && (
        <Alert type="error" showIcon className="!mt-2" message={actionDraftErrorMessage(command.error)} />
      )}

      <Space className="!mt-3" wrap>
        {affordances.status === 'PENDING' && (
          <>
            <Tooltip title={affordances.confirmBlockedReason}>
              <Button type="primary" disabled={!affordances.canConfirm} onClick={() => { command.reset(); setConfirmOpen(true); }}>
                Xác nhận
              </Button>
            </Tooltip>
            <Button disabled={!affordances.canReject} onClick={() => { command.reset(); setRejectOpen(true); }}>
              Từ chối
            </Button>
          </>
        )}
        {affordances.offerAskAgain && (
          <Button onClick={() => onAskAgain(askAgainPrompt(draft))}>Hỏi lại trợ lý</Button>
        )}
      </Space>

      <ActionDraftConfirmModal
        draft={draft}
        open={confirmOpen}
        submitting={command.isPending}
        error={command.error}
        onConfirm={() => command.mutate({ action: 'confirm' }, { onSuccess: () => setConfirmOpen(false) })}
        onClose={() => setConfirmOpen(false)}
      />
      <Modal
        open={rejectOpen}
        title="Từ chối bản nháp?"
        okText="Từ chối"
        cancelText="Quay lại"
        confirmLoading={command.isPending}
        okButtonProps={{ disabled: reasonInvalid }}
        onOk={() =>
          command.mutate(
            { action: 'reject', reason: trimmedReason || undefined },
            { onSuccess: () => { setRejectOpen(false); setRejectReason(''); } },
          )
        }
        onCancel={() => setRejectOpen(false)}
        destroyOnHidden
      >
        <Typography.Paragraph>Bản nháp sẽ đóng lại và tồn kho không thay đổi. Muốn điều chỉnh sau này phải hỏi lại trợ lý.</Typography.Paragraph>
        <Input.TextArea
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          maxLength={COPILOT_LIMITS.REJECT_REASON_MAX}
          showCount
          rows={3}
          placeholder="Lý do (không bắt buộc, tối thiểu 3 ký tự)"
          status={reasonInvalid ? 'error' : undefined}
        />
        {Boolean(command.error) && (
          <Alert className="!mt-3" type="error" showIcon message={actionDraftErrorMessage(command.error)} />
        )}
      </Modal>
    </Card>
  );
}
