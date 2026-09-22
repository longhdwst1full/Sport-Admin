import { useMemo, useState } from 'react';
import { MoneyInput } from '@/foundation/inputs/money-input';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FireOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
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
  Tag,
  Typography,
} from 'antd';
import { AdminTable } from '@/foundation/table';
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
      width={940}
      destroyOnClose
      styles={{
        header: { padding: '16px 24px', borderBottom: '1px solid #f1f5f9' },
        body: { padding: '20px 24px', backgroundColor: '#f8fafc' },
      }}
      title={
        campaign ? (
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 border border-amber-500/20">
              {campaign.code}
            </span>
            <span className="text-base font-bold text-slate-800">{campaign.name}</span>
          </div>
        ) : (
          'Chi tiết chiến dịch Flash Sale'
        )
      }
      extra={
        campaign && canManage ? (
          <Button
            type="primary"
            ghost
            icon={<EditOutlined />}
            className="!rounded-xl !font-semibold"
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
        <div className="space-y-6">
          {/* Campaign Overview Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Tag
                  color={flashSaleStatusPresentation[campaign.status]?.color ?? 'default'}
                  className="!px-3 !py-1 !text-xs !font-bold !rounded-full !m-0 !border"
                >
                  ● {flashSaleStatusPresentation[campaign.status]?.label ?? campaign.status}
                </Tag>
                <span className="text-xs font-semibold text-slate-500">
                  Tổng <strong className="text-slate-800 font-bold">{campaign.itemCount}</strong> suất bán
                </span>
              </div>

              {/* Status Transitions */}
              {canManage && allowedTransitions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Chuyển trạng thái:</span>
                  {allowedTransitions.map((status) => (
                    <Popconfirm
                      key={status}
                      title={`Chuyển chiến dịch sang ${flashSaleStatusPresentation[status]?.label ?? status}?`}
                      okText="Xác nhận"
                      cancelText="Hủy"
                      onConfirm={() => statusMutation.mutate(status)}
                    >
                      <Button
                        size="small"
                        className="!rounded-lg !text-xs !font-semibold"
                        loading={statusMutation.isPending}
                      >
                        {flashSaleStatusPresentation[status]?.label ?? status}
                      </Button>
                    </Popconfirm>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Info Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CalendarOutlined className="text-base" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Thời gian bắt đầu</span>
                  <span className="text-sm font-bold text-slate-800">
                    {new Date(campaign.startsAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3.5 border border-slate-100">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <ClockCircleOutlined className="text-base" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Thời gian kết thúc</span>
                  <span className="text-sm font-bold text-slate-800">
                    {new Date(campaign.endsAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {campaign.description && (
              <div className="mt-3.5 rounded-xl bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-600 border border-slate-100">
                <span className="font-bold text-slate-700">Mô tả: </span>
                {campaign.description}
              </div>
            )}
          </div>

          {/* Suất bán Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FireOutlined className="text-amber-500 text-base" />
                <h3 className="text-sm font-bold text-slate-800 m-0">Danh sách suất bán Flash Sale</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {campaign.items?.length ?? 0}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <AdminTable
                rowKey="id"
                size="middle"
                dataSource={campaign.items}
                pagination={false}
                loading={detail.isFetching}
                locale={{ emptyText: 'Chưa có suất bán nào trong chiến dịch.' }}
                columns={[
                  {
                    title: 'SKU',
                    dataIndex: 'sku',
                    width: 160,
                    render: (sku: string) => (
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                        {sku}
                      </span>
                    ),
                  },
                  {
                    title: 'Sản phẩm',
                    dataIndex: 'productName',
                    render: (name: string) => (
                      <span className="font-bold text-slate-800 line-clamp-1 text-xs sm:text-sm">
                        {name}
                      </span>
                    ),
                  },
                  {
                    title: 'Giá flash',
                    dataIndex: 'salePrice',
                    width: 140,
                    align: 'right',
                    render: (value: string) => (
                      <span className="font-black text-amber-600 text-sm">
                        {moneyFormatter.format(Number(value))}
                      </span>
                    ),
                  },
                  {
                    title: 'Giá thường',
                    dataIndex: 'regularPrice',
                    width: 130,
                    align: 'right',
                    render: (value: string | null) =>
                      value ? (
                        <span className="text-xs text-slate-400 line-through">
                          {moneyFormatter.format(Number(value))}
                        </span>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    title: 'Quota',
                    dataIndex: 'quota',
                    width: 85,
                    align: 'right',
                    render: (q: number) => (
                      <span className="font-semibold text-slate-700">{q}</span>
                    ),
                  },
                  {
                    title: 'Đã bán',
                    dataIndex: 'soldQuantity',
                    width: 85,
                    align: 'right',
                    render: (sold: number) => (
                      <span className="font-bold text-slate-800">{sold}</span>
                    ),
                  },
                  {
                    title: 'Còn lại',
                    dataIndex: 'availableQuantity',
                    width: 85,
                    align: 'right',
                    render: (avail: number) => (
                      <Tag
                        color={avail > 0 ? 'green' : 'default'}
                        className="!m-0 !font-bold !rounded-md"
                      >
                        {avail}
                      </Tag>
                    ),
                  },
                  {
                    title: '',
                    key: 'action',
                    width: 50,
                    align: 'center',
                    render: (_, row) =>
                      canManage ? (
                        <Popconfirm
                          title="Gỡ suất bán này?"
                          description="Đã phát sinh giao dịch thì suất chỉ được ngừng bán, không xóa."
                          okText="Gỡ"
                          cancelText="Hủy"
                          onConfirm={() =>
                            removeMutation.mutate({ itemId: row.id, version: row.version })
                          }
                        >
                          <Button
                            size="small"
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            className="hover:!bg-red-50"
                          />
                        </Popconfirm>
                      ) : null,
                  },
                ]}
              />
            </div>
          </div>

          {/* Add Item & Pricing Panel */}
          {canManage && campaign.status !== 'ENDED' && campaign.status !== 'CANCELLED' && (
            <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 p-5 shadow-xs space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-amber-100/80">
                <div className="flex items-center gap-2">
                  <ThunderboltOutlined className="text-amber-600 text-base" />
                  <span className="text-sm font-bold text-slate-800">Thêm suất bán mới</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Cách đặt giá:</span>
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
                    className="!text-xs"
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
                      className="!w-28"
                    />
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 m-0">
                {pricingMode === 'PERCENT_LIST'
                  ? '💡 Giá từng suất tính theo phần trăm và bị khoá để không lệch mức đã công bố.'
                  : '💡 Giá điền sẵn bằng giá đang bán, có thể sửa riêng cho từng sản phẩm.'}
              </p>

              <Form
                form={form}
                layout="vertical"
                className="mt-2"
                onFinish={(values) => itemMutation.mutate(values)}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end">
                  <div className="lg:col-span-4">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Chọn biến thể / SKU</span>}
                      name="productVariantId"
                      rules={[{ required: true, message: 'Chọn biến thể' }]}
                      className="!mb-0"
                    >
                      <Select
                        showSearch
                        filterOption={false}
                        placeholder="Tìm theo SKU hoặc tên..."
                        onSearch={setVariantSearch}
                        loading={variantsQuery.isFetching}
                        className="!w-full"
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
                  </div>

                  <div className="lg:col-span-3">
                    <Form.Item
                      label={
                        <span className="text-xs font-bold text-slate-700">
                          Giá flash {basePrice ? `(Gốc: ${moneyFormatter.format(basePrice)})` : ''}
                        </span>
                      }
                      name="salePrice"
                      rules={[{ required: true, message: 'Nhập giá flash' }]}
                      className="!mb-0"
                    >
                      <MoneyInput
                        min={1}
                        step={1000}
                        placeholder="Giá flash"
                        className="!w-full"
                        disabled={pricingMode === 'PERCENT_LIST'}
                      />
                    </Form.Item>
                  </div>

                  <div className="lg:col-span-2">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Quota</span>}
                      name="quota"
                      rules={[{ required: true, message: 'Nhập quota' }]}
                      className="!mb-0"
                    >
                      <InputNumber min={1} placeholder="Số suất" className="!w-full" />
                    </Form.Item>
                  </div>

                  <div className="lg:col-span-2">
                    <Form.Item
                      label={<span className="text-xs font-bold text-slate-700">Giới hạn/khách</span>}
                      name="perCustomerLimit"
                      className="!mb-0"
                    >
                      <InputNumber min={1} placeholder="Không giới hạn" className="!w-full" />
                    </Form.Item>
                  </div>

                  <div className="lg:col-span-1">
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<PlusOutlined />}
                      loading={itemMutation.isPending}
                      className="!w-full !rounded-xl !font-bold !bg-amber-500 hover:!bg-amber-600 !border-amber-500"
                    >
                      Lưu
                    </Button>
                  </div>
                </div>
              </Form>
            </div>
          )}
        </div>
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
