import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Drawer, Empty, Image, Space, Table, Tag, Timeline, Typography } from 'antd';
import { usePermissions } from '@/core/auth/permissions';
import { StatusTag } from '@/foundation/management';
import { CurrencyAmount } from '@/foundation/typography/currency-amount';
import { useGetAdminReturn } from '@/generated/api/returns/returns';
import type { ReturnDetailDto } from '@/generated/api/returns/models';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  inspectionConditionLabels,
  inspectionDispositionLabels,
  refundMethodLabels,
  refundStatusPresentation,
  returnActionLabels,
  returnFaultLabels,
  returnReasonLabels,
  returnStatusPresentation,
} from '../constants/return.constants';
import { useReturnCommand, type ReturnCommand } from '../hooks/use-return-command';
import { availableReturnActions, type ReturnAction } from '../model/return-actions.policy';
import { ReturnActionModal } from './return-action-modal';

const actionButtons: Record<ReturnAction, { label: string; type?: 'primary'; danger?: boolean }> = {
  approve: { label: 'Duyệt', type: 'primary' },
  reject: { label: 'Từ chối', danger: true },
  cancel: { label: 'Huỷ phiếu', danger: true },
  receive: { label: 'Nhận & kiểm hàng', type: 'primary' },
  requestRefund: { label: 'Tạo lượt hoàn tiền', type: 'primary' },
  confirmRefund: { label: 'Xác nhận đã hoàn', type: 'primary' },
  failRefund: { label: 'Lượt hoàn lỗi', danger: true },
  close: { label: 'Đóng phiếu' },
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

export function ReturnDetailDrawer({ returnId, onClose }: { returnId?: string; onClose: () => void }) {
  const { message } = App.useApp();
  const permissions = usePermissions();
  const [action, setAction] = useState<ReturnAction>();
  const detailQuery = useGetAdminReturn(returnId ?? '', { query: { enabled: Boolean(returnId), retry: false } });
  const command = useReturnCommand(returnId);
  const detail = detailQuery.data;

  const closeAction = () => {
    if (command.isPending) return;
    command.reset();
    setAction(undefined);
  };
  const closeDrawer = () => {
    if (command.isPending) return;
    closeAction();
    onClose();
  };
  const submit = (next: ReturnCommand) => {
    command.mutate(next, {
      onSuccess: () => {
        void message.success('Đã cập nhật phiếu trả');
        command.reset();
        setAction(undefined);
      },
    });
  };

  return (
    <Drawer
      open={Boolean(returnId)}
      onClose={closeDrawer}
      width={880}
      title={detail ? (
        <div className="flex flex-wrap items-center gap-3">
          <span>{detail.returnNo}</span>
          <StatusTag status={detail.status} presentations={returnStatusPresentation} />
        </div>
      ) : 'Phiếu trả hàng'}
      extra={detail && <ActionBar detail={detail} permissions={permissions} onAction={setAction} />}
      destroyOnHidden
    >
      {detailQuery.isLoading && <Card loading className="rounded-2xl" />}
      {detailQuery.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được phiếu trả"
          description={getApiErrorMessage(detailQuery.error)}
          action={<Button onClick={() => void detailQuery.refetch()}>Thử lại</Button>}
        />
      )}
      {detail && (
        <div className="space-y-5">
          <ReturnSummary detail={detail} />
          <ReturnItems detail={detail} />
          <ReturnRefunds detail={detail} />
          <Card size="small" title="Lịch sử thao tác" className="rounded-2xl">
            <Timeline
              items={detail.history.map((entry) => ({
                children: (
                  <div>
                    <strong>{returnActionLabels[entry.action]}</strong>
                    <span className="ml-2 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
                    {entry.reason && <div className="text-sm text-slate-600">{entry.reason}</div>}
                  </div>
                ),
              }))}
            />
          </Card>
          <ReturnActionModal
            detail={detail}
            action={action}
            submitting={command.isPending}
            error={command.error}
            onSubmit={submit}
            onClose={closeAction}
          />
        </div>
      )}
    </Drawer>
  );
}

function ActionBar({
  detail,
  permissions,
  onAction,
}: {
  detail: ReturnDetailDto;
  permissions: ReadonlySet<string>;
  onAction: (action: ReturnAction) => void;
}) {
  const actions = availableReturnActions(detail, permissions);
  if (actions.length === 0) return null;
  return (
    <Space wrap>
      {actions.map((action) => (
        <Button key={action} {...actionButtons[action]} onClick={() => onAction(action)}>
          {actionButtons[action].label}
        </Button>
      ))}
    </Space>
  );
}

function ReturnSummary({ detail }: { detail: ReturnDetailDto }) {
  return (
    <Card size="small" className="rounded-2xl">
      <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Đơn hàng">{detail.orderNo}</Descriptions.Item>
        <Descriptions.Item label="Khách">{detail.recipientName}</Descriptions.Item>
        <Descriptions.Item label="Kênh">{detail.channel === 'ACCOUNT' ? 'Khách tự tạo' : 'Nhân viên tạo hộ'}</Descriptions.Item>
        <Descriptions.Item label="Lý do">{returnReasonLabels[detail.reasonCode]}</Descriptions.Item>
        <Descriptions.Item label="Giao hàng lúc">{formatDateTime(detail.deliveredAt)}</Descriptions.Item>
        <Descriptions.Item label="Tạo lúc">{formatDateTime(detail.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="Lỗi thuộc về">{detail.fault ? returnFaultLabels[detail.fault] : 'Chưa chốt'}</Descriptions.Item>
        <Descriptions.Item label="Nhận hàng lúc">{formatDateTime(detail.receivedAt)}</Descriptions.Item>
        <Descriptions.Item label={detail.refundCap ? 'Trần hoàn (đã chốt)' : 'Hoàn dự kiến'}>
          <CurrencyAmount amount={detail.estimatedRefundAmount} />
          {!detail.refundCap && <Typography.Text type="secondary" className="ml-1 text-xs">(có thể đổi sau kiểm hàng)</Typography.Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Còn có thể hoàn"><CurrencyAmount amount={detail.refundableAmount} /></Descriptions.Item>
      </Descriptions>
      {detail.windowOverridden && (
        <Alert className="mt-3" type="warning" showIcon message={`Nhận trả quá hạn: ${detail.windowOverrideNote ?? ''}`} />
      )}
      {detail.description && <Typography.Paragraph className="mt-3 whitespace-pre-line">{detail.description}</Typography.Paragraph>}
      {detail.decisionNote && <Typography.Paragraph type="secondary">Ghi chú quyết định: {detail.decisionNote}</Typography.Paragraph>}
      {detail.evidenceImages.length > 0 && (
        <Image.PreviewGroup>
          <Space wrap className="mt-2">
            {detail.evidenceImages.map((image) => (
              <Image key={image.url} width={96} height={96} src={image.thumbnailUrl} preview={{ src: image.url }} className="rounded-lg object-cover" />
            ))}
          </Space>
        </Image.PreviewGroup>
      )}
    </Card>
  );
}

function ReturnItems({ detail }: { detail: ReturnDetailDto }) {
  return (
    <Card size="small" title="Sản phẩm trả" className="rounded-2xl">
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={detail.items}
        columns={[
          {
            title: 'Sản phẩm',
            render: (_, item) => (
              <div>
                <strong>{item.productName}</strong>
                <div className="text-xs text-slate-500">{item.sku} · {item.variantName}</div>
                {item.itemType === 'BUNDLE' && <Tag color="gold" className="mt-1">Combo nguyên bộ</Tag>}
              </div>
            ),
          },
          { title: 'SL', dataIndex: 'quantity', width: 56 },
          { title: 'Đơn giá', width: 120, render: (_, item) => <CurrencyAmount amount={item.unitPrice} /> },
          {
            title: 'Kết quả kiểm',
            width: 200,
            render: (_, item) => item.condition ? (
              <div>
                <div>{inspectionConditionLabels[item.condition]}</div>
                {item.disposition && <div className="text-xs text-slate-500">{inspectionDispositionLabels[item.disposition]}</div>}
                {item.note && <div className="text-xs text-slate-500">{item.note}</div>}
              </div>
            ) : <span className="text-slate-400">Chưa kiểm</span>,
          },
          { title: 'Trần hoàn', width: 120, render: (_, item) => (item.refundCap ? <CurrencyAmount amount={item.refundCap} /> : '—') },
        ]}
      />
    </Card>
  );
}

function ReturnRefunds({ detail }: { detail: ReturnDetailDto }) {
  return (
    <Card size="small" title="Hoàn tiền" className="rounded-2xl">
      {detail.refunds.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lượt hoàn tiền" />
      ) : (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={detail.refunds}
          columns={[
            { title: 'Mã', dataIndex: 'refundNo', width: 190 },
            { title: 'Phương thức', width: 120, render: (_, refund) => refundMethodLabels[refund.method] },
            { title: 'Số tiền', width: 120, render: (_, refund) => <CurrencyAmount amount={refund.amount} /> },
            { title: 'Trạng thái', width: 150, render: (_, refund) => <StatusTag status={refund.status} presentations={refundStatusPresentation} /> },
            {
              title: 'Đối chiếu',
              render: (_, refund) => (
                <div className="text-xs">
                  {refund.externalRef && <div>Mã GD: <Typography.Text copyable>{refund.externalRef}</Typography.Text></div>}
                  {refund.processedAt && <div className="text-slate-500">{formatDateTime(refund.processedAt)}</div>}
                  {refund.failureReason && <div className="text-rose-600">{refund.failureReason}</div>}
                  {refund.proofImages.length > 0 && (
                    <Image.PreviewGroup>
                      <Space className="mt-1">
                        {refund.proofImages.map((image) => (
                          <Image key={image.url} width={40} height={40} src={image.thumbnailUrl} preview={{ src: image.url }} className="rounded object-cover" />
                        ))}
                      </Space>
                    </Image.PreviewGroup>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span>Đã hoàn: <strong><CurrencyAmount amount={detail.refundedAmount} /></strong></span>
        <span>Đang chờ: <CurrencyAmount amount={detail.pendingRefundAmount} /></span>
      </div>
    </Card>
  );
}
