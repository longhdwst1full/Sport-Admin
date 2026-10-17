import { useMemo, useRef, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, InputNumber, Radio, Select, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { AdminTable, TableActionButton } from '@/foundation/table';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import type { ActiveLookupOptionDto } from '@/generated/api/catalog/catalog.schemas';
import { useSearchState } from '@/shared/hooks/use-search-state';
import {
  applyPercent,
  moneyFormatter,
  pricingModeOptions,
  variantOptionLabel,
  type PricingMode,
} from '../constants/flash-sale.constants';
import {
  isItemChanged,
  newEditableItem,
  validateItem,
  type EditableItem,
} from '../model/flash-sale.mapper';

type EditableField = 'salePrice' | 'quota' | 'perCustomerLimit';

/**
 * Bảng soạn suất bán dùng chung cho tạo và sửa chiến dịch: chọn nhiều SKU một lượt, sửa giá/suất
 * ngay trên dòng, và nơi gọi lưu tất cả cùng lúc. Dòng mới bỏ được khỏi bảng; gỡ suất đã lưu làm ở
 * bảng chi tiết chiến dịch (cần xác nhận + version riêng của suất).
 */
export function FlashSaleItemsEditor({
  items,
  onChange,
  enabled,
  showErrors,
}: {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  /** Chỉ tìm SKU khi drawer đang mở. */
  enabled: boolean;
  /** Bật sau lần bấm lưu đầu tiên để không báo đỏ khi người dùng chưa kịp nhập. */
  showErrors: boolean;
}) {
  const [pricingMode, setPricingMode] = useState<PricingMode>('PER_ITEM');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [pending, setPending] = useState<string[]>([]);
  const variantSearch = useSearchState();
  // Giữ option đã thấy qua các lượt tìm để chọn nhiều SKU ở nhiều từ khoá khác nhau rồi thêm một lần.
  const seen = useRef(new Map<string, ActiveLookupOptionDto>());

  const variantsQuery = useSearchActiveAdminProductVariants(
    { search: variantSearch.debounced, page: 1, limit: 50 },
    { query: { enabled } },
  );
  const inTable = useMemo(() => new Set(items.map((item) => item.productVariantId)), [items]);
  const options = useMemo(() => {
    for (const option of variantsQuery.data?.items ?? []) seen.current.set(option.id, option);
    const pendingOptions = pending.flatMap((id) => seen.current.get(id) ?? []);
    const merged = [...pendingOptions, ...(variantsQuery.data?.items ?? []).filter((o) => !pending.includes(o.id))];
    return merged.map((option) => ({
      value: option.id,
      label: variantOptionLabel(option),
      disabled: inTable.has(option.id),
    }));
  }, [variantsQuery.data?.items, pending, inTable]);

  const priceFor = (basePrice?: number) =>
    pricingMode === 'PERCENT_LIST' && basePrice !== undefined ? applyPercent(basePrice, discountPercent) : undefined;

  function addPending() {
    const added = pending.flatMap((id) => {
      const option = seen.current.get(id);
      return option && !inTable.has(id) ? [newEditableItem(option, priceFor(Number(option.priceAmount ?? NaN) || undefined))] : [];
    });
    onChange([...items, ...added]);
    setPending([]);
  }

  /** Giá theo % chỉ áp cho dòng mới: dòng đã lưu có thể đang bán, đổi hàng loạt dễ sai giá đã công bố. */
  function applyPricing(mode: PricingMode, percent: number) {
    if (mode !== 'PERCENT_LIST') return;
    onChange(
      items.map((item) =>
        item.itemId || item.basePrice === undefined
          ? item
          : { ...item, salePrice: applyPercent(item.basePrice, percent) },
      ),
    );
  }

  const update = (variantId: string, field: EditableField, value: number | null) =>
    onChange(items.map((item) => (item.productVariantId === variantId ? { ...item, [field]: value } : item)));

  const columns: ColumnsType<EditableItem> = [
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_value, item) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-800">{item.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-mono text-slate-500">{item.sku}</span>
            {!item.itemId && <Tag color="blue" className="!m-0">Mới</Tag>}
            {item.inactive && <Tag className="!m-0">Đã gỡ — lưu để mở bán lại</Tag>}
            {item.itemId && !item.inactive && isItemChanged(item) && <Tag color="gold" className="!m-0">Đã sửa</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: 'Giá gốc',
      key: 'basePrice',
      width: 120,
      align: 'right',
      render: (_value, item) =>
        item.basePrice === undefined ? <span className="text-slate-400">—</span> : moneyFormatter.format(item.basePrice),
    },
    {
      title: 'Giá flash',
      key: 'salePrice',
      width: 160,
      render: (_value, item) => {
        const error = showErrors ? validateItem(item).salePrice : undefined;
        const aboveBase = item.basePrice !== undefined && item.salePrice != null && item.salePrice >= item.basePrice;
        return (
          <Tooltip title={error ?? (aboveBase ? 'Giá flash không thấp hơn giá gốc' : undefined)}>
            <MoneyInput
              min={1}
              step={1000}
              className="!w-full"
              status={error ? 'error' : aboveBase ? 'warning' : undefined}
              value={item.salePrice}
              disabled={pricingMode === 'PERCENT_LIST' && !item.itemId && item.basePrice !== undefined}
              onChange={(value) => update(item.productVariantId, 'salePrice', value ?? null)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Số suất',
      key: 'quota',
      width: 110,
      render: (_value, item) => {
        const error = showErrors ? validateItem(item).quota : undefined;
        return (
          <Tooltip title={error ?? (item.committed > 0 ? `Đã bán/đang giữ ${item.committed}` : undefined)}>
            <InputNumber
              min={Math.max(item.committed, 1)}
              precision={0}
              className="!w-full"
              status={error ? 'error' : undefined}
              value={item.quota}
              onChange={(value) => update(item.productVariantId, 'quota', value ?? null)}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Giới hạn/khách',
      key: 'perCustomerLimit',
      width: 130,
      render: (_value, item) => (
        <InputNumber
          min={1}
          precision={0}
          placeholder="Không giới hạn"
          className="!w-full"
          value={item.perCustomerLimit}
          onChange={(value) => update(item.productVariantId, 'perCustomerLimit', value ?? null)}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      align: 'center',
      render: (_value, item) =>
        !item.itemId && (
          <TableActionButton
            danger
            label={`Bỏ ${item.sku} khỏi danh sách`}
            icon={<DeleteOutlined />}
            onClick={() => onChange(items.filter((row) => row.productVariantId !== item.productVariantId))}
          />
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <Typography.Text strong className="text-sm">Cách đặt giá</Typography.Text>
        <Radio.Group
          value={pricingMode}
          onChange={(event) => {
            const mode = event.target.value as PricingMode;
            setPricingMode(mode);
            applyPricing(mode, discountPercent);
          }}
          optionType="button"
          buttonStyle="solid"
          options={pricingModeOptions}
        />
        {pricingMode === 'PERCENT_LIST' && (
          <InputNumber
            min={1}
            max={99}
            value={discountPercent}
            onChange={(value) => {
              const percent = Number(value ?? 0);
              setDiscountPercent(percent);
              applyPricing('PERCENT_LIST', percent);
            }}
            addonAfter="%"
            className="!w-28"
          />
        )}
        <span className="text-xs text-slate-500">
          {pricingMode === 'PERCENT_LIST'
            ? 'Áp cho các sản phẩm mới thêm; suất đã lưu giữ nguyên giá.'
            : 'Giá điền sẵn bằng giá đang bán, sửa riêng từng dòng.'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          mode="multiple"
          showSearch
          allowClear
          filterOption={false}
          maxTagCount="responsive"
          placeholder="Tìm và chọn nhiều SKU / tên sản phẩm"
          className="min-w-72 flex-1"
          value={pending}
          onChange={setPending}
          onSearch={variantSearch.setValue}
          loading={variantsQuery.isFetching}
          options={options}
        />
        <Button type="primary" ghost icon={<PlusOutlined />} disabled={pending.length === 0} onClick={addPending}>
          Thêm {pending.length > 0 ? `${pending.length} sản phẩm` : 'sản phẩm'}
        </Button>
      </div>

      <AdminTable<EditableItem>
        rowKey="productVariantId"
        size="small"
        pagination={false}
        dataSource={items}
        scroll={{ x: 820 }}
        locale={{ emptyText: 'Chưa có suất bán nào. Chọn sản phẩm ở trên rồi bấm Thêm.' }}
        columns={columns}
      />
    </div>
  );
}
