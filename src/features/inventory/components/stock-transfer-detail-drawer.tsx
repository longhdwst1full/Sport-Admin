import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Skeleton, Tag, Typography } from 'antd';
import { AdminTable } from '@/foundation/table';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { usePermissions } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import {
  getGetStockTransferQueryKey,
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockTransfersQueryKey,
  useCancelStockTransfer,
  useGetStockTransfer,
  useReceiveStockTransfer,
  useShipStockTransfer,
  useSubmitStockTransfer,
} from '@/generated/api/inventory/inventory';
import type { StockTransferDetailDto } from '@/generated/api/inventory/inventory.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import { StockTransferCreateDrawer } from './stock-transfer-create-drawer';
import { availableStockTransferActions } from '../model/stock-transfer-actions.policy';
import { stockTransferStatusMeta } from '../model/stock-transfer-display';

interface ReceiveLineValues {
  sku: string;
  receivedQuantity: number;
  damagedQuantity: number;
  damageReason?: string;
}

interface ReceiveValues {
  items: ReceiveLineValues[];
}

const receiveSchema: yup.ObjectSchema<ReceiveValues> = yup.object({
  items: yup.array().of(yup.object({
    sku: yup.string().required(),
    receivedQuantity: yup.number().integer('Phải là số nguyên').min(0, 'Không được âm').required(),
    damagedQuantity: yup.number().integer('Phải là số nguyên').min(0, 'Không được âm').required(),
    damageReason: yup.string().trim().max(500, 'Tối đa 500 ký tự').optional(),
  })).required(),
});



function receiveDefaults(transfer?: StockTransferDetailDto): ReceiveValues {
  return {
    items: (transfer?.items ?? []).map((item) => ({
      sku: item.sku,
      receivedQuantity: item.shippedQuantity,
      damagedQuantity: 0,
      damageReason: '',
    })),
  };
}

export function StockTransferDetailDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const detail = useGetStockTransfer(id ?? '', { query: { enabled: Boolean(id) } });
  const form = useForm<ReceiveValues>({ resolver: yupResolver(receiveSchema), defaultValues: { items: [] } });
  const lines = useFieldArray({ control: form.control, name: 'items' });
  const transfer = detail.data;
  const permissions = usePermissions();
  const actions = transfer ? availableStockTransferActions(transfer.status, permissions) : [];
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    form.reset(receiveDefaults(transfer));
  }, [form, transfer]);

  const refresh = async (transferId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListStockTransfersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetStockTransferQueryKey(transferId) }),
      queryClient.invalidateQueries({ queryKey: getListInventoryBalancesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
    ]);
  };
  const success = (result: StockTransferDetailDto, text: string) => {
    void refresh(result.id);
    void message.success(text);
  };
  const failure = (error: unknown, fallback: string) => void message.error(getApiErrorMessage(error, fallback));
  const submitMutation = useSubmitStockTransfer({ mutation: {
    onSuccess: (result) => success(result, `Đã gửi duyệt phiếu ${result.transferNo}.`),
    onError: (error) => failure(error, 'Không thể gửi phiếu chuyển kho.'),
  } });
  const shipMutation = useShipStockTransfer({ mutation: {
    onSuccess: (result) => success(result, `Đã xuất kho phiếu ${result.transferNo}.`),
    onError: (error) => failure(error, 'Không thể xuất kho.'),
  } });
  const receiveMutation = useReceiveStockTransfer({ mutation: {
    onSuccess: (result) => success(result, `Đã nhận hàng phiếu ${result.transferNo}.`),
    onError: (error) => failure(error, 'Không thể xác nhận nhận hàng.'),
  } });

  const cancelMutation = useCancelStockTransfer({ mutation: {
    onSuccess: (result) => {
      setCancelOpen(false);
      setCancelReason('');
      success(result, `Đã huỷ phiếu ${result.transferNo}.`);
    },
    onError: (error) => failure(error, 'Không thể huỷ phiếu chuyển kho.'),
  } });
  const submitCancel = () => {
    if (!transfer || cancelReason.trim().length < 3) return;
    cancelMutation.mutate({ id: transfer.id, data: { version: transfer.version, reason: cancelReason.trim() } });
  };

  const confirmSubmit = () => {
    if (!transfer) return;
    modal.confirm({
      title: `Gửi phiếu ${transfer.transferNo}?`,
      content: 'Sau khi gửi, phiếu chuyển sang Chờ xuất và không thể sửa danh sách SKU trong V1.',
      okText: 'Gửi phiếu',
      cancelText: 'Hủy',
      onOk: () => submitMutation.mutateAsync({ id: transfer.id, data: { version: transfer.version } }),
    });
  };
  const confirmShip = () => {
    if (!transfer) return;
    modal.confirm({
      title: `Xác nhận xuất toàn bộ phiếu ${transfer.transferNo}?`,
      content: 'Hệ thống sẽ trừ tồn khả dụng tại kho xuất và ghi TRANSFER_OUT. Thao tác này không thể hoàn tác trực tiếp.',
      okText: 'Xuất kho',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => shipMutation.mutateAsync({ id: transfer.id, data: { version: transfer.version } }),
    });
  };
  const prepareReceive = form.handleSubmit((values) => {
    if (!transfer) return;
    for (let index = 0; index < transfer.items.length; index += 1) {
      const source = transfer.items[index];
      const result = values.items[index];
      if (result.receivedQuantity + result.damagedQuantity !== source.shippedQuantity) {
        form.setError(`items.${index}.receivedQuantity`, { message: `Tổng nhận tốt + hỏng phải bằng ${source.shippedQuantity}` });
        return;
      }
      if (result.damagedQuantity > 0 && !result.damageReason?.trim()) {
        form.setError(`items.${index}.damageReason`, { message: 'Bắt buộc nhập lý do hàng hỏng' });
        return;
      }
    }
    modal.confirm({
      title: `Hoàn tất nhận phiếu ${transfer.transferNo}?`,
      content: 'Chỉ số lượng nhận tốt được cộng vào tồn có thể bán. Hàng hỏng được lưu riêng để truy vết.',
      okText: 'Xác nhận đã nhận',
      cancelText: 'Kiểm tra lại',
      onOk: () => receiveMutation.mutateAsync({
        id: transfer.id,
        data: {
          version: transfer.version,
          items: values.items.map((item) => ({
            sku: item.sku,
            receivedQuantity: item.receivedQuantity,
            damagedQuantity: item.damagedQuantity,
            ...(item.damageReason?.trim() ? { damageReason: item.damageReason.trim() } : {}),
          })),
        },
      }),
    });
  });

  return (
    <Drawer title={transfer ? `Phiếu ${transfer.transferNo}` : 'Chi tiết chuyển kho'} width={840} open={Boolean(id)} onClose={onClose} destroyOnHidden>
      {detail.isPending ? <Skeleton active /> : detail.isError ? (
        <QueryErrorAlert error={detail.error} retry={() => void detail.refetch()} />
      ) : !transfer ? <Empty description="Không tìm thấy phiếu chuyển kho" /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{transfer.fromWarehouseCode} → {transfer.toWarehouseCode}</Typography.Title>
              <Typography.Text type="secondary">Tạo bởi {transfer.createdByDisplayName} · version {transfer.version}</Typography.Text>
            </div>
            <Tag color={stockTransferStatusMeta[transfer.status].color}>{stockTransferStatusMeta[transfer.status].label}</Tag>
          </div>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Lý do" span={2}>{transfer.reason}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDateTime(transfer.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Số SKU">{transfer.itemCount}</Descriptions.Item>
            <Descriptions.Item label="Đã xuất">{transfer.shippedAt ? formatDateTime(transfer.shippedAt) : '—'}</Descriptions.Item>
            <Descriptions.Item label="Đã nhận">{transfer.receivedAt ? formatDateTime(transfer.receivedAt) : '—'}</Descriptions.Item>
            {transfer.status === 'CANCELLED' && (
              <>
                <Descriptions.Item label="Huỷ lúc">{transfer.cancelledAt ? formatDateTime(transfer.cancelledAt) : '—'}</Descriptions.Item>
                <Descriptions.Item label="Người huỷ">{transfer.cancelledByDisplayName ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Lý do huỷ" span={2}>{transfer.cancelReason ?? '—'}</Descriptions.Item>
              </>
            )}
          </Descriptions>
          <AdminTable rowKey="id" size="small" pagination={false} dataSource={transfer.items} scroll={{ x: 700 }} columns={[
            { title: 'SKU / Sản phẩm', dataIndex: 'sku', render: (value, row) => <div><strong>{value}</strong><div className="text-xs text-slate-500">{row.productName}</div></div> },
            { title: 'Yêu cầu', dataIndex: 'requestedQuantity', align: 'right' },
            { title: 'Đã xuất', dataIndex: 'shippedQuantity', align: 'right' },
            { title: 'Nhận tốt', dataIndex: 'receivedQuantity', align: 'right' },
            { title: 'Hỏng', dataIndex: 'damagedQuantity', align: 'right' },
            { title: 'Lý do hỏng', dataIndex: 'damageReason', render: (value) => value || '—' },
          ]} />

          {transfer.status === 'SHIPPED' && (
            <Form layout="vertical" onFinish={() => void prepareReceive()} className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <Alert className="mb-4" type="warning" showIcon message="Kiểm nhận từng SKU" description="Tổng nhận tốt và hàng hỏng phải đúng bằng số đã xuất. Chỉ hàng nhận tốt được cộng vào tồn bán." />
              {lines.fields.map((line, index) => (
                <div key={line.id} className="grid gap-3 md:grid-cols-[1fr_130px_130px_1fr]">
                  <Form.Item label="SKU"><Input value={line.sku} disabled /></Form.Item>
                  <Form.Item label="Nhận tốt" required validateStatus={form.formState.errors.items?.[index]?.receivedQuantity ? 'error' : undefined} help={form.formState.errors.items?.[index]?.receivedQuantity?.message}>
                    <Controller name={`items.${index}.receivedQuantity`} control={form.control} render={({ field }) => <InputNumber {...field} min={0} precision={0} className="w-full" />} />
                  </Form.Item>
                  <Form.Item label="Hàng hỏng" required validateStatus={form.formState.errors.items?.[index]?.damagedQuantity ? 'error' : undefined} help={form.formState.errors.items?.[index]?.damagedQuantity?.message}>
                    <Controller name={`items.${index}.damagedQuantity`} control={form.control} render={({ field }) => <InputNumber {...field} min={0} precision={0} className="w-full" />} />
                  </Form.Item>
                  <Form.Item label="Lý do hỏng" validateStatus={form.formState.errors.items?.[index]?.damageReason ? 'error' : undefined} help={form.formState.errors.items?.[index]?.damageReason?.message}>
                    <Controller name={`items.${index}.damageReason`} control={form.control} render={({ field }) => <Input {...field} maxLength={500} placeholder="Bắt buộc nếu có hàng hỏng" />} />
                  </Form.Item>
                </div>
              ))}
            </Form>
          )}

          <div className="flex justify-end gap-2">
            {actions.includes('cancel') && <Button danger onClick={() => setCancelOpen(true)}>Huỷ phiếu</Button>}
            {actions.includes('edit') && <Button onClick={() => setEditing(true)}>Sửa phiếu</Button>}
            {actions.includes('submit') && <Button type="primary" loading={submitMutation.isPending} onClick={confirmSubmit}>Gửi phiếu</Button>}
            {actions.includes('ship') && <Button type="primary" danger loading={shipMutation.isPending} onClick={confirmShip}>Xác nhận xuất kho</Button>}
            {actions.includes('receive') && <Button type="primary" loading={receiveMutation.isPending} onClick={() => void prepareReceive()}>Xác nhận nhận hàng</Button>}
          </div>
        </div>
      )}
      <StockTransferCreateDrawer open={editing && Boolean(transfer)} transfer={transfer} onClose={() => setEditing(false)} />
      <Modal
        title={transfer ? `Huỷ phiếu ${transfer.transferNo}?` : 'Huỷ phiếu'}
        open={cancelOpen}
        okText="Huỷ phiếu"
        okButtonProps={{ danger: true, disabled: cancelReason.trim().length < 3, loading: cancelMutation.isPending }}
        cancelText="Đóng"
        onOk={submitCancel}
        onCancel={() => setCancelOpen(false)}
        destroyOnHidden
      >
        <p className="mb-3 text-slate-600">Phiếu chưa xuất kho nên huỷ không làm thay đổi tồn. Thao tác không hoàn tác được.</p>
        <Input.TextArea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} maxLength={1000} showCount placeholder="Lý do huỷ (ít nhất 3 ký tự)" />
      </Modal>
    </Drawer>
  );
}
