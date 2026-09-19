import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Skeleton, Tag, Typography } from 'antd';
import { AdminTable } from '@/foundation/table';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { PermissionGate } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import {
  getGetStockTransferQueryKey,
  getListInventoryBalancesQueryKey,
  getListInventoryMovementsQueryKey,
  getListStockTransfersQueryKey,
  useGetStockTransfer,
  useReceiveStockTransfer,
  useShipStockTransfer,
  useSubmitStockTransfer,
} from '@/generated/api/inventory/inventory';
import type { StockTransferDetailDto } from '@/generated/api/inventory/models';
import { getApiErrorMessage } from '@/lib/api/error';

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

const statusMeta = {
  DRAFT: { label: 'Nháp', color: 'default' },
  SUBMITTED: { label: 'Chờ xuất', color: 'blue' },
  SHIPPED: { label: 'Đang vận chuyển', color: 'orange' },
  RECEIVED: { label: 'Đã nhận', color: 'green' },
} as const;

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
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const detail = useGetStockTransfer(id ?? '', { query: { enabled: Boolean(id) } });
  const form = useForm<ReceiveValues>({ resolver: yupResolver(receiveSchema), defaultValues: { items: [] } });
  const lines = useFieldArray({ control: form.control, name: 'items' });
  const transfer = detail.data;

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

  const confirmSubmit = () => {
    if (!transfer) return;
    Modal.confirm({
      title: `Gửi phiếu ${transfer.transferNo}?`,
      content: 'Sau khi gửi, phiếu chuyển sang Chờ xuất và không thể sửa danh sách SKU trong V1.',
      okText: 'Gửi phiếu',
      cancelText: 'Hủy',
      onOk: () => submitMutation.mutateAsync({ id: transfer.id, data: { version: transfer.version } }),
    });
  };
  const confirmShip = () => {
    if (!transfer) return;
    Modal.confirm({
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
    Modal.confirm({
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
            <Tag color={statusMeta[transfer.status].color}>{statusMeta[transfer.status].label}</Tag>
          </div>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Lý do" span={2}>{transfer.reason}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{new Date(transfer.createdAt).toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Số SKU">{transfer.itemCount}</Descriptions.Item>
            <Descriptions.Item label="Đã xuất">{transfer.shippedAt ? new Date(transfer.shippedAt).toLocaleString('vi-VN') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Đã nhận">{transfer.receivedAt ? new Date(transfer.receivedAt).toLocaleString('vi-VN') : '—'}</Descriptions.Item>
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
            {transfer.status === 'DRAFT' && <PermissionGate permission="inventory.transfer.create"><Button type="primary" loading={submitMutation.isPending} onClick={confirmSubmit}>Gửi phiếu</Button></PermissionGate>}
            {transfer.status === 'SUBMITTED' && <PermissionGate permission="inventory.transfer.ship"><Button type="primary" danger loading={shipMutation.isPending} onClick={confirmShip}>Xác nhận xuất kho</Button></PermissionGate>}
            {transfer.status === 'SHIPPED' && <PermissionGate permission="inventory.transfer.receive"><Button type="primary" loading={receiveMutation.isPending} onClick={() => void prepareReceive()}>Xác nhận nhận hàng</Button></PermissionGate>}
          </div>
        </div>
      )}
    </Drawer>
  );
}
