import { useMemo, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Drawer,
  Descriptions,
  Form,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import {
  changeAdminFlashSaleStatus,
  getGetAdminFlashSaleQueryKey,
  getListAdminFlashSalesQueryKey,
  removeAdminFlashSaleItem,
  upsertAdminFlashSaleItem,
  useGetAdminFlashSale,
} from '@/generated/api/promotions/promotions';
import type { FlashSaleCampaignDetailDto } from '@/generated/api/promotions/models';
import { useCan } from '@/core/auth/permissions';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  FLASH_SALE_TRANSITIONS,
  flashSaleStatusPresentation,
  moneyFormatter,
} from '../constants/flash-sale.constants';

interface ItemFormValues {
  productVariantId?: string;
  salePrice?: number;
  quota?: number;
  perCustomerLimit?: number;
}

export function FlashSaleDetailDrawer({
  campaignId,
  onClose,
}: {
  campaignId?: string;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('catalog.flash_sale.manage');
  const [form] = Form.useForm<ItemFormValues>();
  const [variantSearch, setVariantSearch] = useState('');
  const [debouncedVariantSearch] = useDebounce(variantSearch.trim(), 350);

  const detail = useGetAdminFlashSale(campaignId ?? '', {
    query: { enabled: Boolean(campaignId) },
  });
  const campaign = detail.data;

  const variantsQuery = useSearchActiveAdminProductVariants(
    { search: debouncedVariantSearch || undefined, page: 1, limit: 50 },
    { query: { enabled: Boolean(campaignId) && canManage } },
  );

  const allowedTransitions = useMemo(
    () => (campaign ? (FLASH_SALE_TRANSITIONS[campaign.status] ?? []) : []),
    [campaign],
  );

  async function refresh(updated: FlashSaleCampaignDetailDto) {
    queryClient.setQueryData(getGetAdminFlashSaleQueryKey(updated.id), updated);
    await queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() });
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!campaign) throw new Error('Chưa tải được chiến dịch');
      return changeAdminFlashSaleStatus(campaign.id, {
        expectedVersion: campaign.version,
        status: status as never,
      });
    },
    onSuccess: async (updated) => {
      await refresh(updated);
      void message.success('Đã cập nhật trạng thái chiến dịch');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const itemMutation = useMutation({
    mutationFn: (values: ItemFormValues) => {
      if (!campaign) throw new Error('Chưa tải được chiến dịch');
      return upsertAdminFlashSaleItem(campaign.id, {
        productVariantId: values.productVariantId!,
        // Decimal gửi dạng chuỗi: gửi number sẽ mất chính xác ở tiền tệ.
        salePrice: Number(values.salePrice ?? 0).toFixed(2),
        quota: values.quota!,
        perCustomerLimit: values.perCustomerLimit,
      });
    },
    onSuccess: async (updated) => {
      await refresh(updated);
      form.resetFields();
      void message.success('Đã lưu suất bán');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: ({ itemId, version }: { itemId: string; version: string }) => {
      if (!campaign) throw new Error('Chưa tải được chiến dịch');
      return removeAdminFlashSaleItem(campaign.id, itemId, { expectedVersion: version });
    },
    onSuccess: async (updated) => {
      await refresh(updated);
      void message.success('Đã gỡ suất bán');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  return (
    <Drawer
      open={Boolean(campaignId)}
      onClose={onClose}
      width={880}
      destroyOnClose
      title={campaign ? `${campaign.code} — ${campaign.name}` : 'Chi tiết chiến dịch'}
    >
      {detail.isError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          message="Không tải được chiến dịch"
          description={getApiErrorMessage(detail.error)}
        />
      )}

      {campaign && (
        <>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Trạng thái">
              <Tag color={flashSaleStatusPresentation[campaign.status]?.color ?? 'default'}>
                {flashSaleStatusPresentation[campaign.status]?.label ?? campaign.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số suất bán">{campaign.itemCount}</Descriptions.Item>
            <Descriptions.Item label="Bắt đầu">
              {new Date(campaign.startsAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Kết thúc">
              {new Date(campaign.endsAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả" span={2}>
              {campaign.description ?? '—'}
            </Descriptions.Item>
          </Descriptions>

          {canManage && allowedTransitions.length > 0 && (
            <Space className="mt-4" wrap>
              {allowedTransitions.map((status) => (
                <Popconfirm
                  key={status}
                  title={`Chuyển chiến dịch sang ${flashSaleStatusPresentation[status]?.label ?? status}?`}
                  okText="Xác nhận"
                  cancelText="Hủy"
                  onConfirm={() => statusMutation.mutate(status)}
                >
                  <Button loading={statusMutation.isPending}>
                    {flashSaleStatusPresentation[status]?.label ?? status}
                  </Button>
                </Popconfirm>
              ))}
            </Space>
          )}

          <Typography.Title level={5} className="!mt-6">
            Suất bán
          </Typography.Title>
          <Table
            rowKey="id"
            size="small"
            dataSource={campaign.items}
            pagination={false}
            loading={detail.isFetching}
            locale={{ emptyText: 'Chưa có suất bán nào.' }}
            columns={[
              { title: 'SKU', dataIndex: 'sku', width: 170 },
              { title: 'Sản phẩm', dataIndex: 'productName' },
              {
                title: 'Giá flash',
                dataIndex: 'salePrice',
                width: 140,
                align: 'right',
                render: (value: string) => moneyFormatter.format(Number(value)),
              },
              {
                title: 'Giá thường',
                dataIndex: 'regularPrice',
                width: 140,
                align: 'right',
                render: (value: string | null) => (value ? moneyFormatter.format(Number(value)) : '—'),
              },
              { title: 'Quota', dataIndex: 'quota', width: 90, align: 'right' },
              { title: 'Đã bán', dataIndex: 'soldQuantity', width: 90, align: 'right' },
              { title: 'Còn lại', dataIndex: 'availableQuantity', width: 90, align: 'right' },
              {
                title: '',
                key: 'action',
                width: 60,
                render: (_, row) =>
                  canManage ? (
                    <Popconfirm
                      title="Gỡ suất bán này?"
                      description="Đã phát sinh giao dịch thì suất chỉ được ngừng bán, không xóa."
                      okText="Gỡ"
                      cancelText="Hủy"
                      onConfirm={() => removeMutation.mutate({ itemId: row.id, version: row.version })}
                    >
                      <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ) : null,
              },
            ]}
          />

          {canManage && campaign.status !== 'ENDED' && campaign.status !== 'CANCELLED' && (
            <Form
              form={form}
              layout="inline"
              className="mt-4 gap-y-3"
              onFinish={(values) => itemMutation.mutate(values)}
            >
              <Form.Item
                name="productVariantId"
                rules={[{ required: true, message: 'Chọn biến thể' }]}
                className="min-w-72"
              >
                <Select
                  showSearch
                  filterOption={false}
                  placeholder="Tìm theo SKU"
                  onSearch={setVariantSearch}
                  loading={variantsQuery.isFetching}
                  options={(variantsQuery.data?.items ?? []).map((item) => ({
                    value: item.id,
                    label: `${item.code} — ${item.label}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="salePrice" rules={[{ required: true, message: 'Nhập giá flash' }]}>
                <InputNumber min={1} step={1000} placeholder="Giá flash" className="!w-40" />
              </Form.Item>
              <Form.Item name="quota" rules={[{ required: true, message: 'Nhập quota' }]}>
                <InputNumber min={1} placeholder="Quota" className="!w-28" />
              </Form.Item>
              <Form.Item name="perCustomerLimit">
                <InputNumber min={1} placeholder="Giới hạn/khách" className="!w-36" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={itemMutation.isPending}
                >
                  Lưu suất bán
                </Button>
              </Form.Item>
            </Form>
          )}
        </>
      )}
    </Drawer>
  );
}
