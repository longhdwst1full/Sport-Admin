import { BarcodeOutlined, TagOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { SearchInput } from '@/foundation/inputs/search-input';
import { FilterBar, RefreshButton } from '@/foundation/table';

export function ProductListToolbar({
  name,
  sku,
  productNo,
  category,
  categoryOptions,
  categoriesLoading,
  onNameChange,
  onSkuChange,
  onProductNoChange,
  onCategoryChange,
  refreshing,
  onRefresh,
}: {
  name: string;
  sku: string;
  productNo: string;
  category?: string;
  categoryOptions: Array<{ value: string; label: string }>;
  categoriesLoading: boolean;
  onNameChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onProductNoChange: (value: string) => void;
  onCategoryChange: (value?: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <FilterBar actions={<RefreshButton onRefresh={onRefresh} loading={refreshing} />}>
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </div>
    </FilterBar>
  );
}
