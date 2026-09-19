import { Input, Select } from 'antd';

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
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Input
        allowClear
        value={name}
        placeholder="Tên sản phẩm"
        className="!w-full"
        onChange={(event) => onNameChange(event.target.value)}
      />
      <Input
        allowClear
        value={sku}
        placeholder="SKU"
        className="!w-full"
        onChange={(event) => onSkuChange(event.target.value)}
      />
      <Input
        allowClear
        value={productNo}
        placeholder="Mã sản phẩm"
        className="!w-full"
        onChange={(event) => onProductNoChange(event.target.value)}
      />
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder="Lọc theo danh mục"
        className="!w-full"
        value={category}
        onChange={onCategoryChange}
        loading={categoriesLoading}
        options={categoryOptions}
      />
    </div>
  );
}
