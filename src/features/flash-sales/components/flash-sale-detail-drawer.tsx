import { useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Drawer,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import dayjs, { type Dayjs } from 'dayjs';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import {
  changeAdminFlashSaleStatus,
  getGetAdminFlashSaleQueryKey,
  getListAdminFlashSalesQueryKey,
  removeAdminFlashSaleItem,
  updateAdminFlashSale,
  upsertAdminFlashSaleItem,
  useGetAdminFlashSale,
} from '@/generated/api/promotions/promotions';
import type { FlashSaleCampaignDetailDto } from '@/generated/api/promotions/models';
import { useCan } from '@/core/auth/permissions';
import { getApiErrorMessage } from '@/lib/api/error';
import {
  FLASH_SALE_TRANSITIONS,
  applyPercent,
  flashSaleStatusPresentation,
  moneyFormatter,
  type PricingMode,
} from '../constants/flash-sale.constants';

interface CampaignFormValues {
  name: string;
  description?: string;
  window: [Dayjs, Dayjs];
}

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
  const [campaignForm] = Form.useForm<CampaignFormValues>();
  const [editOpen, setEditOpen] = useState(false);
  const [variantSearch, setVariantSearch] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('PER_ITEM');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [basePrice, setBasePrice] = useState<number>();
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

  const campaignMutation = useMutation({
    mutationFn: (values: CampaignFormValues) => {
      if (!campaign) throw new Error('Chưa tải được chiến dịch');
      return updateAdminFlashSale(campaign.id, {
        expectedVersion: campaign.version,
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        startsAt: values.window[0].toISOString(),
        endsAt: values.window[1].toISOString(),
      });
    },
    onSuccess: async (updated) => {
      await refresh(updated);
      setEditOpen(false);
      void message.success('Đã cập nhật chiến dịch');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

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
      extra={
        campaign && canManage ? (
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              campaignForm.setFieldsValue({
                name: campaign.name,
                description: campaign.description ?? undefined,
                window: [dayjs(campaign.startsAt), dayjs(campaign.endsAt)],
              });
              setEditOpen(true);
            }}
          >
            Sửa chiến dịch
          </Button>
        ) : undefined
      }
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
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <Typography.Text strong className="text-sm">
                Cách đặt giá
              </Typography.Text>
              <Radio.Group
                value={pricingMode}
                onChange={(event) => {
                  const next = event.target.value as PricingMode;
                  setPricingMode(next);
                  if (basePrice === undefined) return;
                  form.setFieldsValue({
                    salePrice:
                      next === 'PERCENT_LIST' ? applyPercent(basePrice, discountPercent) : basePrice,
                  });
                }}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { value: 'PER_ITEM', label: 'Giá từng sản phẩm' },
                  { value: 'PERCENT_LIST', label: 'Giảm % cho cả danh sách' },
                ]}
              />
              {pricingMode === 'PERCENT_LIST' && (
                <InputNumber
                  min={1}
                  max={99}
                  value={discountPercent}
                  onChange={(value) => {
                    const percent = Number(value ?? 0);
                    setDiscountPercent(percent);
                    if (basePrice !== undefined) {
                      form.setFieldsValue({ salePrice: applyPercent(basePrice, percent) });
                    }
                  }}
                  addonAfter="%"
                  className="!w-32"
                />
              )}
              <Typography.Text type="secondary" className="text-xs">
                {pricingMode === 'PERCENT_LIST'
                  ? 'Giá từng suất tính theo phần trăm và bị khoá để không lệch mức đã công bố.'
                  : 'Giá điền sẵn bằng giá đang bán, sửa được cho từng sản phẩm.'}
              </Typography.Text>
            </div>
          )}

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
                  onChange={(variantId: string) => {
                    const picked = (variantsQuery.data?.items ?? []).find(
                      (item) => item.id === variantId,
                    );
                    const current = picked?.priceAmount ? Number(picked.priceAmount) : undefined;
                    setBasePrice(current);
                    if (current === undefined) return;
                    form.setFieldsValue({
                      salePrice:
                        pricingMode === 'PERCENT_LIST'
                          ? applyPercent(current, discountPercent)
                          : current,
                    });
                  }}
                  options={(variantsQuery.data?.items ?? []).map((item) => ({
                    value: item.id,
                    label: item.priceAmount
                      ? `${item.code} — ${item.label} · ${moneyFormatter.format(Number(item.priceAmount))}`
                      : `${item.code} — ${item.label}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="salePrice"
                rules={[{ required: true, message: 'Nhập giá flash' }]}
                extra={
                  basePrice ? (
                    <Typography.Text type="secondary" className="text-xs">
                      Giá hiện tại {moneyFormatter.format(basePrice)}
                    </Typography.Text>
                  ) : undefined
                }
              >
                <InputNumber
                  min={1}
                  step={1000}
                  placeholder="Giá flash"
                  className="!w-40"
                  disabled={pricingMode === 'PERCENT_LIST'}
                />
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
      <Modal
        open={editOpen}
        title="Sửa chiến dịch"
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={campaignMutation.isPending}
        onCancel={() => setEditOpen(false)}
        onOk={() => void campaignForm.submit()}
        destroyOnClose
      >
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="Đổi khung giờ ảnh hưởng tới giá đang hiển thị"
          description="Rút ngắn khung giờ của chiến dịch đang chạy sẽ khiến giá flash biến mất khỏi trang bán ngay khi qua thời điểm kết thúc mới."
        />
        <Form
          form={campaignForm}
          layout="vertical"
          onFinish={(values) => campaignMutation.mutate(values)}
        >
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên chiến dịch' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="window"
            label="Khung giờ chạy"
            rules={[{ required: true, message: 'Chọn thời gian bắt đầu và kết thúc' }]}
          >
            <DatePicker.RangePicker showTime className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
