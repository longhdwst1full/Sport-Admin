import { BarcodeOutlined, TagOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { SearchInput } from '@/foundation/inputs/search-input';
import { FilterBar, RefreshButton } from '@/foundation/table';
import type { ProductStatus } from '@/generated/api/catalog/catalog.schemas';
import { PRODUCT_STATUS_OPTIONS } from '../constants/product-list.constants';

export function ProductListToolbar({
  name,
  sku,
  productNo,
  category,
  status,
  categoryOptions,
  categoriesLoading,
  onNameChange,
  onSkuChange,
  onProductNoChange,
  onCategoryChange,
  onStatusChange,
  refreshing,
  onRefresh,
}: {
  name: string;
  sku: string;
  productNo: string;
  category?: string;
  status?: ProductStatus;
  categoryOptions: Array<{ value: string; label: string }>;
  categoriesLoading: boolean;
  onNameChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onProductNoChange: (value: string) => void;
  onCategoryChange: (value?: string) => void;
  onStatusChange: (value?: ProductStatus) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <FilterBar actions={<RefreshButton onRefresh={onRefresh} loading={refreshing} />}>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SearchInput value={name} placeholder="Nhập tên sản phẩm..." className="!w-full" onChange={onNameChange} />
        <SearchInput
          value={sku}
          icon={<BarcodeOutlined className="text-slate-400" />}
          placeholder="Nhập mã SKU..."
          className="!w-full"
          onChange={onSkuChange}
        />
        <SearchInput
          value={productNo}
          icon={<TagOutlined className="text-slate-400" />}
          placeholder="Nhập mã sản phẩm..."
          className="!w-full"
          onChange={onProductNoChange}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Chọn danh mục sản phẩm"
          className="!w-full"
          value={category}
          onChange={onCategoryChange}
          loading={categoriesLoading}
          options={categoryOptions}
        />
        <Select
          aria-label="Lọc trạng thái sản phẩm"
          allowClear
          placeholder="Tất cả trạng thái"
          className="!w-full"
          value={status}
          onChange={onStatusChange}
          options={PRODUCT_STATUS_OPTIONS}
        />
      </div>
    </FilterBar>
  );
}
