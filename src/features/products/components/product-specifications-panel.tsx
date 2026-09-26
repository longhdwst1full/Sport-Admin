import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Descriptions, Select, Space, Switch, Typography } from 'antd';
import { useState } from 'react';
import { PermissionGate } from '@/core/auth/permissions';
import { useListAdminAttributes, useReplaceAdminProductSpecifications } from '@/generated/api/catalog/catalog';
import { AttributeDataType, AttributeStatus, type ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { toSpecificationPayload, toSpecificationRows, type SpecificationRow } from '../model/product-specifications';

/**
 * Thông số kỹ thuật của sản phẩm (decision D61): chọn thuộc tính từ từ điển dùng chung, nhập giá trị theo
 * kiểu. Ghi đè cả bộ với `expectedVersion` của sản phẩm; API là nơi kiểm cuối cùng.
 */
export function ProductSpecificationsPanel({ product, onChanged }: { product: ProductDetailDto; onChanged: () => Promise<void> }) {
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<SpecificationRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const attributesQuery = useListAdminAttributes({ query: { enabled: editing } });
  const attributes = attributesQuery.data?.items ?? [];
  const byCode = new Map(attributes.map((attribute) => [attribute.code, attribute]));
  const replace = useReplaceAdminProductSpecifications({
    mutation: {
      onSuccess: async () => {
        await onChanged();
        setEditing(false);
        void message.success('Đã lưu thông số kỹ thuật.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể lưu thông số.')),
    },
  });

  const startEdit = () => {
    setRows(toSpecificationRows(product.specifications));
    setErrors([]);
    setEditing(true);
  };
  const updateRow = (index: number, next: Partial<SpecificationRow>) =>
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...next } : row)));
  const save = () => {
    const result = toSpecificationPayload(rows, attributes);
    setErrors(result.errors);
    if (result.errors.length > 0) return;
    replace.mutate({ id: product.id, data: { specifications: result.specifications, expectedVersion: product.version } });
  };

  if (!editing) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Typography.Title level={5} className="!m-0">Thông số kỹ thuật</Typography.Title>
          <PermissionGate permission="catalog.product.manage">
            <Button icon={<EditOutlined />} disabled={product.status === 'ARCHIVED'} onClick={startEdit}>Sửa thông số</Button>
          </PermissionGate>
        </div>
        {product.specifications.length === 0 ? (
          <Typography.Text type="secondary">Chưa nhập thông số.</Typography.Text>
        ) : (
          <Descriptions bordered size="small" column={1}>
            {product.specifications.map((spec) => (
              <Descriptions.Item key={spec.code} label={spec.name}>{spec.values.map(({ label }) => label).join(' / ')}</Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </div>
    );
  }

  const selectable = attributes.filter((attribute) => attribute.status === AttributeStatus.ACTIVE || rows.some((row) => row.code === attribute.code));
  return (
    <div>
      <Typography.Title level={5}>Sửa thông số kỹ thuật</Typography.Title>
      {errors.length > 0 && <Alert className="!mb-3" type="error" showIcon message={<ul className="m-0 pl-4">{errors.map((text) => <li key={text}>{text}</li>)}</ul>} />}
      <Space direction="vertical" className="w-full">
        {rows.map((row, index) => {
          const attribute = byCode.get(row.code);
          return (
            <Space key={index} align="start" wrap className="w-full">
              <Select
                className="!w-56"
                placeholder="Chọn thuộc tính"
                showSearch
                optionFilterProp="label"
                loading={attributesQuery.isPending}
                value={row.code || undefined}
                options={selectable.map((item) => ({ value: item.code, label: item.unit ? `${item.name} (${item.unit})` : item.name }))}
                onChange={(code: string) => updateRow(index, { code, values: [] })}
              />
              {attribute?.dataType === AttributeDataType.BOOLEAN ? (
                <Switch checkedChildren="Có" unCheckedChildren="Không" checked={row.values[0] === 'true'} onChange={(checked) => updateRow(index, { values: [String(checked)] })} />
              ) : attribute?.dataType === AttributeDataType.OPTION ? (
                <Select mode="multiple" className="!min-w-64" value={row.values} options={attribute.options.map((option) => ({ value: option.code, label: option.label }))} onChange={(values: string[]) => updateRow(index, { values })} />
              ) : (
                <Select
                  mode="tags"
                  className="!min-w-64"
                  value={row.values}
                  tokenSeparators={['/', ';']}
                  placeholder={attribute?.dataType === AttributeDataType.NUMBER ? `Số${attribute.unit ? ` (${attribute.unit})` : ''}, Enter để thêm` : 'Nhập giá trị, Enter để thêm'}
                  open={false}
                  onChange={(values: string[]) => updateRow(index, { values })}
                />
              )}
              <Button icon={<DeleteOutlined />} aria-label="Bỏ dòng" onClick={() => setRows((current) => current.filter((_, position) => position !== index))} />
            </Space>
          );
        })}
        <Button icon={<PlusOutlined />} onClick={() => setRows((current) => [...current, { code: '', values: [] }])}>Thêm thông số</Button>
      </Space>
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={() => setEditing(false)}>Hủy</Button>
        <Button type="primary" loading={replace.isPending} onClick={save}>Lưu thông số</Button>
      </div>
    </div>
  );
}
