import { useMemo, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  InboxOutlined,
  RocketOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Descriptions, Input, Modal, Select, Space, Tag, Timeline, Typography } from 'antd';
import { useCan } from '@/core/auth/permissions';
import {
  deliverAdminFulfillment,
  failAdminFulfillmentDelivery,
  getGetAdminFulfillmentByOrderQueryKey,
  getGetAdminFulfillmentQueryKey,
  getListAdminFulfillmentsQueryKey,
  packAdminFulfillment,
  pickAdminFulfillment,
  receiveAdminFulfillmentReturn,
  shipAdminFulfillment,
  useGetAdminFulfillmentByOrder,
} from '@/generated/api/fulfillments/fulfillments';
import type { FulfillmentDetailDto } from '@/generated/api/fulfillments/models';
import { getGetAdminOrderQueryKey, getListAdminOrdersQueryKey } from '@/generated/api/orders/orders';
import { getApiErrorMessage } from '@/lib/api/error';

type FulfillmentAction = 'pick' | 'pack' | 'ship' | 'deliver' | 'fail' | 'receive';

const statusPresentation: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ lấy hàng', color: 'default' },
  PICKING: { label: 'Đang lấy hàng', color: 'processing' },
  PACKED: { label: 'Đã đóng gói', color: 'cyan' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'blue' },
  DELIVERED: { label: 'Đã giao', color: 'green' },
  DELIVERY_FAILED: { label: 'Giao thất bại', color: 'red' },
  RETURNING_TO_WAREHOUSE: { label: 'Đang về kho', color: 'orange' },
  RETURNED_TO_WAREHOUSE: { label: 'Đã về kho', color: 'gold' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

const actionPresentation: Record<FulfillmentAction, { title: string; okText: string; note: string }> = {
  pick: { title: 'Bắt đầu lấy hàng', okText: 'Bắt đầu lấy', note: 'Đơn phải được xác nhận trước khi nhân viên bắt đầu lấy hàng.' },
  pack: { title: 'Xác nhận đóng gói', okText: 'Đã đóng gói', note: 'Chỉ xác nhận khi đã kiểm đủ số lượng và đóng gói toàn bộ đơn.' },
  ship: { title: 'Bàn giao vận chuyển', okText: 'Bàn giao', note: 'Bước này trừ tồn thực tế và commit lượng hàng đã giữ. Đơn chuyển khoản phải nhận đủ tiền.' },
  deliver: { title: 'Xác nhận giao thành công', okText: 'Đã giao', note: 'Xác nhận khách đã nhận đủ hàng. Đơn COD vẫn cần ghi nhận thu tiền trước khi hoàn tất.' },
  fail: { title: 'Ghi nhận giao thất bại', okText: 'Xác nhận thất bại', note: 'Hàng sẽ chuyển sang trạng thái đang quay về đúng kho xuất.' },
  receive: { title: 'Kho nhận lại hàng', okText: 'Nhận hàng hoàn', note: 'Chỉ hàng SELLABLE được cộng lại vào tồn có thể bán.' },
};

interface FulfillmentWorkflowPanelProps {
  orderId: string;
}

export function FulfillmentWorkflowPanel({ orderId }: FulfillmentWorkflowPanelProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canPick = useCan('fulfillment.pick');
  const canPack = useCan('fulfillment.pack');
  const canShip = useCan('fulfillment.ship');
  const canUpdateDelivery = useCan('fulfillment.delivery_update');
  const [action, setAction] = useState<FulfillmentAction>();
  const [note, setNote] = useState('');
  const [carrierCode, setCarrierCode] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [reasonCode, setReasonCode] = useState('CUSTOMER_UNAVAILABLE');
  const [condition, setCondition] = useState<'SELLABLE' | 'DAMAGED' | 'MISSING'>('SELLABLE');
  const idempotencyRef = useRef<{ signature: string; key: string } | undefined>(undefined);
  const fulfillmentQuery = useGetAdminFulfillmentByOrder(orderId, { query: { enabled: Boolean(orderId), retry: false } });
  const fulfillment = fulfillmentQuery.data;

  const availableActions = useMemo(() => {
    if (!fulfillment) return [] as FulfillmentAction[];
    if (fulfillment.status === 'PENDING' && canPick) return ['pick'];
    if (fulfillment.status === 'PICKING' && canPack) return ['pack'];
    if (fulfillment.status === 'PACKED' && canShip) return ['ship'];
    if (fulfillment.status === 'SHIPPED' && canUpdateDelivery) return ['deliver', 'fail'];
    if (fulfillment.status === 'RETURNING_TO_WAREHOUSE' && canUpdateDelivery) return ['receive'];
    return [] as FulfillmentAction[];
  }, [canPack, canPick, canShip, canUpdateDelivery, fulfillment]);

  const mutation = useMutation<FulfillmentDetailDto, unknown>({
    mutationFn: async () => {
      if (!fulfillment || !action) throw new Error('Thiếu thông tin thao tác giao vận');
      const normalizedNote = note.trim();
      const signature = [action, fulfillment.id, fulfillment.version, normalizedNote, carrierCode, trackingNo, reasonCode, condition].join(':');
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }
      const request = { headers: { 'Idempotency-Key': idempotencyRef.current.key } };
      const transition = { expectedVersion: fulfillment.version, note: normalizedNote || undefined };
      if (action === 'pick') return pickAdminFulfillment(fulfillment.id, transition, request);
      if (action === 'pack') return packAdminFulfillment(fulfillment.id, transition, request);
      if (action === 'ship') {
        return shipAdminFulfillment(fulfillment.id, {
          ...transition,
          carrierCode: carrierCode.trim() || undefined,
          trackingNo: trackingNo.trim() || undefined,
        }, request);
      }
      if (action === 'deliver') return deliverAdminFulfillment(fulfillment.id, transition, request);
      if (action === 'fail') {
        return failAdminFulfillmentDelivery(fulfillment.id, {
          ...transition,
          reasonCode,
          reason: normalizedNote,
        }, request);
      }
      return receiveAdminFulfillmentReturn(fulfillment.id, {
        ...transition,
        condition,
        reason: normalizedNote,
      }, request);
    },
    retry: false,
    onSuccess: async (updated) => {
      // CACHE: fulfillment transition đồng thời thay đổi Order, Inventory hoặc Payment report projection.
      queryClient.setQueryData(getGetAdminFulfillmentByOrderQueryKey(orderId), updated);
      queryClient.setQueryData(getGetAdminFulfillmentQueryKey(updated.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminFulfillmentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(orderId) }),
        queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
      ]);
      void message.success('Đã cập nhật trạng thái giao vận');
      closeModal();
    },
  });

  const closeModal = () => {
    if (mutation.isPending) return;
    mutation.reset();
    idempotencyRef.current = undefined;
    setAction(undefined);
    setNote('');
    setCarrierCode('');
    setTrackingNo('');
    setReasonCode('CUSTOMER_UNAVAILABLE');
    setCondition('SELLABLE');
  };

  if (fulfillmentQuery.isLoading) return <Card loading className="rounded-2xl" />;
  if (fulfillmentQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được quy trình giao vận"
        description={getApiErrorMessage(fulfillmentQuery.error, 'Vui lòng thử tải lại dữ liệu giao vận.')}
        action={<Button onClick={() => void fulfillmentQuery.refetch()}>Thử lại</Button>}
      />
    );
  }
  if (!fulfillment) return null;

  const status = statusPresentation[fulfillment.status] ?? { label: fulfillment.status, color: 'default' };
  const requiresReason = action === 'fail' || action === 'receive';
  const isValid = !requiresReason || note.trim().length >= 5;

  return (
    <Card
      className="overflow-hidden rounded-2xl border-slate-200"
      title={(
        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
          <span>Giao vận · {fulfillment.fulfillmentNo}</span>
          <Tag color={status.color}>{status.label}</Tag>
        </div>
      )}
    >
      <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Kho xuất">{fulfillment.warehouseName}</Descriptions.Item>
        <Descriptions.Item label="Đơn vị vận chuyển">{fulfillment.carrierCode || 'Nhân viên / thỏa thuận'}</Descriptions.Item>
        <Descriptions.Item label="Mã vận đơn">{fulfillment.trackingNo || 'Chưa có'}</Descriptions.Item>
        <Descriptions.Item label="Phiên bản">{fulfillment.version}</Descriptions.Item>
      </Descriptions>
      <Timeline
        className="mt-5"
        items={fulfillment.history.map((item) => ({
          color: item.toStatus === fulfillment.status ? '#006c5b' : 'gray',
          children: (
            <div>
              <strong>{statusPresentation[item.toStatus]?.label ?? item.toStatus}</strong>
              <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')}</div>
              {item.reason && <div className="mt-1 text-sm text-slate-600">{item.reason}</div>}
            </div>
          ),
        }))}
      />
      {availableActions.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {availableActions.includes('pick') && <Button icon={<InboxOutlined />} onClick={() => setAction('pick')}>Lấy hàng</Button>}
          {availableActions.includes('pack') && <Button icon={<CheckCircleOutlined />} onClick={() => setAction('pack')}>Đóng gói</Button>}
          {availableActions.includes('ship') && <Button type="primary" icon={<RocketOutlined />} onClick={() => setAction('ship')}>Bàn giao vận chuyển</Button>}
          {availableActions.includes('deliver') && <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setAction('deliver')}>Đã giao hàng</Button>}
          {availableActions.includes('fail') && <Button danger icon={<RollbackOutlined />} onClick={() => setAction('fail')}>Giao thất bại</Button>}
          {availableActions.includes('receive') && <Button type="primary" icon={<InboxOutlined />} onClick={() => setAction('receive')}>Kho nhận hàng hoàn</Button>}
        </div>
      )}

      <Modal
        open={Boolean(action)}
        title={action ? actionPresentation[action].title : ''}
        okText={action ? actionPresentation[action].okText : 'Xác nhận'}
        cancelText="Đóng"
        confirmLoading={mutation.isPending}
        okButtonProps={{ danger: action === 'fail', disabled: !isValid }}
        onCancel={closeModal}
        onOk={() => mutation.mutate()}
      >
        {action && <Typography.Paragraph type="secondary">{actionPresentation[action].note}</Typography.Paragraph>}
        <Space direction="vertical" size="middle" className="w-full">
          {action === 'ship' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium" htmlFor="carrier-code">Đơn vị vận chuyển</label>
                <Input id="carrier-code" value={carrierCode} maxLength={64} placeholder="VD: MANUAL, GHN" onChange={(event) => setCarrierCode(event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block font-medium" htmlFor="tracking-no">Mã vận đơn</label>
                <Input id="tracking-no" value={trackingNo} maxLength={128} onChange={(event) => setTrackingNo(event.target.value)} />
              </div>
            </div>
          )}
          {action === 'fail' && (
            <div>
              <label className="mb-1 block font-medium" htmlFor="failure-code">Lý do chuẩn hóa <span className="text-red-500">*</span></label>
              <Select
                id="failure-code"
                className="w-full"
                value={reasonCode}
                onChange={setReasonCode}
                options={[
                  { value: 'CUSTOMER_UNAVAILABLE', label: 'Không liên hệ được khách' },
                  { value: 'CUSTOMER_REJECTED', label: 'Khách từ chối nhận' },
                  { value: 'ADDRESS_INVALID', label: 'Địa chỉ không hợp lệ' },
                  { value: 'OTHER', label: 'Lý do khác' },
                ]}
              />
            </div>
          )}
          {action === 'receive' && (
            <div>
              <label className="mb-1 block font-medium" htmlFor="return-condition">Tình trạng hàng <span className="text-red-500">*</span></label>
              <Select
                id="return-condition"
                className="w-full"
                value={condition}
                onChange={setCondition}
                options={[
                  { value: 'SELLABLE', label: 'Còn bán được — hoàn tồn bán' },
                  { value: 'DAMAGED', label: 'Hư hỏng — không hoàn tồn bán' },
                  { value: 'MISSING', label: 'Thiếu/mất — không hoàn tồn bán' },
                ]}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block font-medium" htmlFor="fulfillment-note">
              {requiresReason ? 'Lý do / kết quả kiểm tra' : 'Ghi chú'} {requiresReason && <span className="text-red-500">*</span>}
            </label>
            <Input.TextArea
              id="fulfillment-note"
              value={note}
              rows={3}
              maxLength={500}
              showCount
              placeholder={requiresReason ? 'Nhập tối thiểu 5 ký tự...' : 'Nhập ghi chú...'}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {mutation.isError && <Alert type="error" showIcon message={getApiErrorMessage(mutation.error, 'Không cập nhật được giao vận.')} />}
        </Space>
      </Modal>
    </Card>
  );
}
