import { DeleteOutlined, PlusOutlined, ProfileOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Select, Switch } from 'antd';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { FormSection } from '@/foundation/layout/form-section';
import { AttributeDataType, AttributeStatus, type AttributeDto } from '@/generated/api/catalog/catalog.schemas';
import type { ProductFormValues } from '../../model/product-form.mapper';
import type { SpecificationRow } from '../../model/product-specifications';

/**
 * Khối Thông số kỹ thuật của tab Thông tin (decision D61), cùng một ô của form ở cả Tạo và Sửa.
 *
 * Chọn thuộc tính từ từ điển dùng chung rồi nhập giá trị theo kiểu. Chuyển kiểu và kiểm theo từ điển
 * xảy ra lúc bấm Tạo/Lưu (`toSpecificationPayload`); lỗi được đưa lại đây qua `errors`. API vẫn là
 * nơi kiểm cuối cùng.
 */
export function ProductSpecificationsTab({
  form,
  attributes,
  loading,
  errors,
}: {
  form: UseFormReturn<ProductFormValues>;
  attributes: AttributeDto[];
  loading: boolean;
  errors: string[];
}) {
  const byCode = new Map(attributes.map((attribute) => [attribute.code, attribute]));

  return (
    <FormSection
      title="Thông số kỹ thuật"
      description="Chọn thuộc tính trong từ điển (Danh mục → Thuộc tính) rồi nhập giá trị. Thông số hiện ở trang chi tiết sản phẩm."
      icon={<ProfileOutlined />}
    >
      <Controller
        name="specifications"
        control={form.control}
        render={({ field }) => {
          const rows: SpecificationRow[] = field.value ?? [];
          const setRows = (next: SpecificationRow[]) => field.onChange(next);
          const updateRow = (index: number, next: Partial<SpecificationRow>) =>
            setRows(rows.map((row, position) => (position === index ? { ...row, ...next } : row)));
          // Thuộc tính INACTIVE chỉ còn chọn được ở dòng đang dùng nó (dữ liệu cũ); API chặn nếu đổi giá trị.
          const selectable = attributes.filter(
            (attribute) => attribute.status === AttributeStatus.ACTIVE || rows.some((row) => row.code === attribute.code),
          );

          return (
            <div className="space-y-3">
              {errors.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  message={<ul className="m-0 pl-4">{errors.map((text) => <li key={text}>{text}</li>)}</ul>}
                />
              )}
              {rows.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa nhập thông số" />}
              {rows.map((row, index) => {
                const attribute = byCode.get(row.code);
                return (
                  <div key={index} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto]">
                    <Select
                      placeholder="Chọn thuộc tính"
                      showSearch
                      optionFilterProp="label"
                      loading={loading}
                      value={row.code || undefined}
                      options={selectable.map((item) => ({
                        value: item.code,
                        label: item.unit ? `${item.name} (${item.unit})` : item.name,
                        disabled: item.code !== row.code && rows.some((other) => other.code === item.code),
                      }))}
                      onChange={(code: string) => updateRow(index, { code, values: [] })}
                    />
                    {attribute?.dataType === AttributeDataType.BOOLEAN ? (
                      <Switch
                        className="justify-self-start"
                        checkedChildren="Có"
                        unCheckedChildren="Không"
                        checked={row.values[0] === 'true'}
                        onChange={(checked) => updateRow(index, { values: [String(checked)] })}
                      />
                    ) : attribute?.dataType === AttributeDataType.OPTION ? (
                      <Select
                        mode="multiple"
                        value={row.values}
                        options={attribute.options.map((option) => ({ value: option.code, label: option.label }))}
                        onChange={(values: string[]) => updateRow(index, { values })}
                      />
                    ) : (
                      <Select
                        mode="tags"
                        value={row.values}
                        tokenSeparators={['/', ';']}
                        disabled={!attribute}
                        placeholder={
                          attribute?.dataType === AttributeDataType.NUMBER
                            ? `Số${attribute.unit ? ` (${attribute.unit})` : ''}, Enter để thêm`
                            : 'Nhập giá trị, Enter để thêm'
                        }
                        open={false}
                        onChange={(values: string[]) => updateRow(index, { values })}
                      />
                    )}
                    <Button
                      icon={<DeleteOutlined />}
                      aria-label={`Bỏ thông số dòng ${index + 1}`}
                      onClick={() => setRows(rows.filter((_, position) => position !== index))}
                    />
                  </div>
                );
              })}
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setRows([...rows, { code: '', values: [] }])}>
                Thêm thông số
              </Button>
            </div>
          );
        }}
      />
    </FormSection>
  );
}
