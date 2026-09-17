import { useMemo, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert, Button, DatePicker, Drawer, Form, Input, InputNumber, Radio, Select, Space, Table,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import { useDebounce } from 'use-debounce';
import { MoneyInput } from '@/foundation/inputs/money-input';
import {
  applyPercent,
  moneyFormatter,
  type PricingMode,
} from '../constants/flash-sale.constants';

export interface StagedItem {
  productVariantId: string;
  sku: string;
  name: string;
  basePrice?: number;
  salePrice: number;
  quota: number;
  perCustomerLimit?: number;
}

export interface CreateCampaignValues {
  code: string;
  name: string;
  description?: string;
  window: [Dayjs, Dayjs];
}

export function FlashSaleCreateDrawer({
  open,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (campaign: CreateCampaignValues, items: StagedItem[]) => void;
}) {
  const [form] = Form.useForm<CreateCampaignValues>();
  const [items, setItems] = useState<StagedItem[]>([]);
  const [pricingMode, setPricingMode] = useState<PricingMode>('PER_ITEM');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [variantId, setVariantId] = useState<string>();
  const [salePrice, setSalePrice] = useState<number>();
  const [quota, setQuota] = useState<number>();
  const [perCustomerLimit, setPerCustomerLimit] = useState<number>();
  const [variantSearch, setVariantSearch] = useState('');
  const [debouncedSearch] = useDebounce(variantSearch.trim(), 350);

  const variantsQuery = useSearchActiveAdminProductVariants(
    { search: debouncedSearch || undefined, page: 1, limit: 50 },
    { query: { enabled: open } },
  );
  const options = useMemo(() => variantsQuery.data?.items ?? [], [variantsQuery.data]);
  const picked = useMemo(() => options.find((o) => o.id === variantId), [options, variantId]);
  const basePrice = picked?.priceAmount ? Number(picked.priceAmount) : undefined;

  function reset() {
    form.resetFields();
    setItems([]);
    setVariantId(undefined);
    setSalePrice(undefined);
    setQuota(undefined);
    setPerCustomerLimit(undefined);
    setPricingMode('PER_ITEM');
    setDiscountPercent(10);
  }

  function addItem() {
    if (!variantId || !picked || !quota) return;
    const price =
      pricingMode === 'PERCENT_LIST' && basePrice !== undefined
        ? applyPercent(basePrice, discountPercent)
        : salePrice;
    if (!price) return;
    setItems((current) => [
      ...current.filter((item) => item.productVariantId !== variantId),
      {
        productVariantId: variantId,
        sku: picked.code,
        name: picked.label,
        basePrice,
        salePrice: price,
        quota,
        ...(perCustomerLimit ? { perCustomerLimit } : {}),
      },
    ]);
    setVariantId(undefined);
    setSalePrice(undefined);
    setQuota(undefined);
    setPerCustomerLimit(undefined);
  }

  /** Đổi % thì mọi suất đã thêm phải tính lại, nếu không danh sách sẽ lẫn hai mức giá. */
  function changePercent(percent: number) {
    setDiscountPercent(percent);
    setItems((current) =>
      current.map((item) =>
        item.basePrice === undefined
          ? item
          : { ...item, salePrice: applyPercent(item.basePrice, percent) },
      ),
    );
  }

  return (
    <Drawer
      open={open}
      width={860}
      destroyOnClose
      title="Tạo chiến dịch flash sale"
      onClose={() => { reset(); onCancel(); }}
      afterOpenChange={(opened) => { if (!opened) reset(); }}
      extra={
        <Space>
          <Button onClick={() => { reset(); onCancel(); }}>Huỷ</Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => void form.validateFields().then((values) => onSubmit(values, items))}
          >
            Tạo chiến dịch{items.length > 0 ? ` + ${items.length} suất` : ''}
          </Button>
        </Space>
      }
    >
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="Chiến dịch tạo ra ở trạng thái nháp"
        description="Suất bán được thêm ngay sau khi chiến dịch được tạo. Chưa có gì hiển thị trên trang bán cho tới khi bạn kích hoạt."
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã chiến dịch"
          rules={[
            { required: true, message: 'Nhập mã chiến dịch' },
            { pattern: /^[A-Za-z0-9-]+$/, message: 'Chỉ dùng chữ, số và dấu gạch ngang' },
          ]}
        >
          <Input placeholder="FLASH-T9-2026" maxLength={32} />
        </Form.Item>
        <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên chiến dịch' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          name="window"
          label="Khung giờ chạy"
          rules={[{ required: true, message: 'Chọn thời gian bắt đầu và kết thúc' }]}
        >
          <DatePicker.RangePicker showTime className="w-full" />
        </Form.Item>
      </Form>

      <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Text strong className="text-sm">Cách đặt giá</Typography.Text>
          <Radio.Group
            value={pricingMode}
            onChange={(event) => setPricingMode(event.target.value as PricingMode)}
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
              onChange={(value) => changePercent(Number(value ?? 0))}
              addonAfter="%"
              className="!w-32"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Select
            showSearch
            filterOption={false}
            placeholder="Tìm theo SKU"
            className="!min-w-64"
            value={variantId}
            onSearch={setVariantSearch}
            loading={variantsQuery.isFetching}
            onChange={(value: string) => {
              setVariantId(value);
              const option = options.find((o) => o.id === value);
              const current = option?.priceAmount ? Number(option.priceAmount) : undefined;
              setSalePrice(
                current === undefined
                  ? undefined
                  : pricingMode === 'PERCENT_LIST'
                    ? applyPercent(current, discountPercent)
                    : current,
              );
            }}
            options={options.map((option) => ({
              value: option.id,
              label: option.priceAmount
                ? `${option.code} — ${option.label} · ${moneyFormatter.format(Number(option.priceAmount))}`
                : `${option.code} — ${option.label}`,
            }))}
          />
          <MoneyInput
            min={1}
            step={1000}
            placeholder="Giá flash"
            className="!w-40"
            value={salePrice}
            onChange={(value) => setSalePrice(value ?? undefined)}
            disabled={pricingMode === 'PERCENT_LIST'}
          />
          <InputNumber min={1} placeholder="Quota" className="!w-28" value={quota}
            onChange={(value) => setQuota(value ?? undefined)} />
          <InputNumber min={1} placeholder="Giới hạn/khách" className="!w-36" value={perCustomerLimit}
            onChange={(value) => setPerCustomerLimit(value ?? undefined)} />
          <Button icon={<PlusOutlined />} onClick={addItem} disabled={!variantId || !quota}>
            Thêm suất
          </Button>
        </div>
        {basePrice !== undefined && (
          <Typography.Text type="secondary" className="mt-2 block text-xs">
            Giá hiện tại của sản phẩm đang chọn: {moneyFormatter.format(basePrice)}
          </Typography.Text>
        )}
      </div>

      <Table<StagedItem>
        className="mt-4"
        rowKey="productVariantId"
        size="small"
        pagination={false}
        dataSource={items}
        locale={{ emptyText: 'Chưa thêm suất bán nào. Có thể tạo chiến dịch trống rồi thêm sau.' }}
        columns={[
          { title: 'SKU', dataIndex: 'sku', width: 140 },
          { title: 'Sản phẩm', dataIndex: 'name' },
          {
            title: 'Giá gốc', dataIndex: 'basePrice', width: 130, align: 'right',
            render: (value?: number) => (value ? moneyFormatter.format(value) : '—'),
          },
          {
            title: 'Giá flash', dataIndex: 'salePrice', width: 130, align: 'right',
            render: (value: number) => (
              <strong className="text-emerald-700">{moneyFormatter.format(value)}</strong>
            ),
          },
          { title: 'Quota', dataIndex: 'quota', width: 80, align: 'right' },
          {
            title: '', key: 'remove', width: 50, align: 'right',
            render: (_, row) => (
              <Button
                type="text" danger size="small" icon={<DeleteOutlined />}
                onClick={() =>
                  setItems((current) =>
                    current.filter((item) => item.productVariantId !== row.productVariantId),
                  )
                }
              />
            ),
          },
        ]}
      />
    </Drawer>
  );
}
