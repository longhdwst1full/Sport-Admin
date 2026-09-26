import { yupResolver } from '@hookform/resolvers/yup';
import { BarcodeOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, InputNumber, Tag } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { PermissionGate } from '@/core/auth/permissions';
import { FormSection } from '@/foundation/layout/form-section';
import { AdminTable, TableActionButton, TableActions } from '@/foundation/table';
import {
  useArchiveAdminProductVariant,
  useCreateAdminProductVariant,
  useReactivateAdminProductVariant,
} from '@/generated/api/catalog/catalog';
import { ProductType, type ProductDetailDto, type ProductVariantDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { SKU_PATTERN, SKU_PATTERN_MESSAGE } from '../../constants/product-list.constants';
import { ProductPricePanel } from '../product-price-panel';
import { VariantEditDrawer } from '../variant-edit-drawer';

interface NewVariantValues {
  name: string;
  sku?: string;
  barcode?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}


/** Cùng luật với ô biến thể của form Tạo, để thêm SKU sau này không dễ hơn/khó hơn lúc tạo. */
const newVariantSchema: yup.ObjectSchema<NewVariantValues> = yup.object({
  name: yup.string().trim().required('Nhập tên biến thể').max(255, 'Tối đa 255 ký tự'),
  sku: yup.string().trim().uppercase().test('sku-pattern', SKU_PATTERN_MESSAGE, (value) => !value || SKU_PATTERN.test(value)).optional(),
  barcode: yup.string().trim().max(64, 'Tối đa 64 ký tự').optional(),
  weightGrams: yup.number().integer('Khối lượng phải là số nguyên').min(0, 'Tối thiểu 0').optional(),
  lengthMm: yup.number().integer('Chiều dài phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
  widthMm: yup.number().integer('Chiều rộng phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
  heightMm: yup.number().integer('Chiều cao phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
});

const emptyNewVariant: NewVariantValues = { name: '', sku: '', barcode: '', weightGrams: 0 };
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const DIMENSIONS = [
  ['weightGrams', 'Khối lượng (g)', 0],
  ['lengthMm', 'Dài (mm)', 1],
  ['widthMm', 'Rộng (mm)', 1],
  ['heightMm', 'Cao (mm)', 1],
] as const;

/**
 * Tab SKU & giá ở chế độ Sửa — SKU thật của sản phẩm và lịch giá. Thành phần combo ở tab Combo.
 *
 * Mỗi thao tác ở đây ghi ngay qua operation riêng (có `expectedVersion` của SKU/giá), không đi qua nút
 * Lưu của form: SKU có vòng đời riêng và giá là lịch bất biến, không thể "sửa nháp rồi lưu một lần".
 */
export function ProductVariantsManager({
  product,
  onChanged,
}: {
  product: ProductDetailDto;
  onChanged: () => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const [editingVariant, setEditingVariant] = useState<ProductVariantDto>();
  const isDraft = product.status === 'DRAFT';
  const isArchived = product.status === 'ARCHIVED';
  const isBundle = product.productType === ProductType.BUNDLE;

  const variantForm = useForm<NewVariantValues>({ resolver: yupResolver(newVariantSchema), defaultValues: emptyNewVariant });

  const createVariant = useCreateAdminProductVariant({
    mutation: {
      onSuccess: async () => {
        await onChanged();
        variantForm.reset(emptyNewVariant);
        void message.success('Đã thêm SKU. Đặt giá cho SKU ở khối lịch giá bên dưới.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể thêm SKU.')),
    },
  });
  const archiveVariant = useArchiveAdminProductVariant({
    mutation: {
      onSuccess: async () => {
        await onChanged();
        void message.success('Đã lưu trữ SKU.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không lưu trữ được SKU.')),
    },
  });
  const reactivateVariant = useReactivateAdminProductVariant({
    mutation: {
      onSuccess: async () => {
        await onChanged();
        void message.success('Đã kích hoạt lại SKU.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể kích hoạt lại SKU.')),
    },
  });

  const submitVariant = variantForm.handleSubmit((values) => {
    createVariant.mutate({
      id: product.id,
      data: {
        name: values.name.trim(),
        ...(values.sku?.trim() ? { sku: values.sku.trim().toUpperCase() } : {}),
        ...(values.barcode?.trim() ? { barcode: values.barcode.trim() } : {}),
        weightGrams: values.weightGrams ?? 0,
        ...(values.lengthMm === undefined ? {} : { lengthMm: values.lengthMm }),
        ...(values.widthMm === undefined ? {} : { widthMm: values.widthMm }),
        ...(values.heightMm === undefined ? {} : { heightMm: values.heightMm }),
      },
    });
  });

  const confirmVariantLifecycle = (variant: ProductVariantDto) => {
    const isActive = variant.status === 'ACTIVE';
    modal.confirm({
      title: `${isActive ? 'Lưu trữ' : 'Kích hoạt lại'} SKU “${variant.sku}”?`,
      content: isActive
        ? 'SKU sẽ không còn được bán mới. Nếu SKU đang là thành phần của combo đã xuất bản, hệ thống sẽ từ chối để combo không mất thành phần.'
        : 'SKU chỉ được kích hoạt lại khi sản phẩm chưa bị lưu trữ.',
      okText: isActive ? 'Lưu trữ SKU' : 'Kích hoạt lại',
      okButtonProps: { danger: isActive },
      cancelText: 'Hủy',
      onOk: () => isActive
        ? archiveVariant.mutateAsync({ variantId: variant.id, data: { expectedVersion: variant.version } })
        : reactivateVariant.mutateAsync({ variantId: variant.id, data: { expectedVersion: variant.version } }),
    });
  };

  return (
    <div className="space-y-4">
      <FormSection
        title="Biến thể bán hàng (SKU)"
        description="SKU không sửa được sau khi tạo. Sửa tên, barcode, kích thước hoặc lưu trữ từng SKU; thao tác lưu ngay."
        icon={<BarcodeOutlined />}
        extra={<Tag color="blue">{product.variants.length} biến thể</Tag>}
      >
        <AdminTable<ProductVariantDto>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={product.variants}
          locale={{ emptyText: 'Chưa có SKU' }}
          columns={[
            { title: 'SKU', dataIndex: 'sku' },
            { title: 'Tên biến thể', dataIndex: 'name' },
            { title: 'Barcode', dataIndex: 'barcode', render: (value?: string) => value ?? '—' },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'default'}>{value}</Tag>,
            },
            {
              title: 'Giá đã VAT',
              dataIndex: 'effectivePrice',
              align: 'right',
              render: (value?: string | null) => (value ? money.format(Number(value)) : <Tag color="orange">Chưa có giá</Tag>),
            },
            ...(isBundle
              ? [{
                  title: 'Combo',
                  key: 'bundle',
                  render: (_: unknown, variant: ProductVariantDto) =>
                    variant.bundle ? `${variant.bundle.components.length} thành phần` : <Tag color="orange">Chưa khai</Tag>,
                }]
              : []),
            {
              title: '',
              key: 'actions',
              align: 'right',
              width: 100,
              fixed: 'right',
              render: (_, variant) => (
                <PermissionGate permission="catalog.product.manage">
                  <TableActions>
                    <TableActionButton
                      label={`Sửa SKU ${variant.sku}`}
                      icon={<EditOutlined />}
                      disabled={isArchived}
                      onClick={() => setEditingVariant(variant)}
                    />
                    <TableActionButton
                      label={variant.status === 'ACTIVE' ? 'Lưu trữ SKU' : 'Kích hoạt SKU'}
                      icon={variant.status === 'ACTIVE' ? <StopOutlined /> : <CheckCircleOutlined />}
                      danger={variant.status === 'ACTIVE'}
                      disabled={isArchived}
                      loading={archiveVariant.isPending || reactivateVariant.isPending}
                      onClick={() => confirmVariantLifecycle(variant)}
                    />
                  </TableActions>
                </PermissionGate>
              ),
            },
          ]}
        />

        {isDraft ? (
          <PermissionGate permission="catalog.product.manage">
            <Form layout="vertical" className="mt-4 rounded-xl border border-dashed border-slate-300 p-4" onFinish={() => void submitVariant()}>
              <div className="mb-3 text-sm font-semibold text-slate-700">Thêm biến thể</div>
              <div className="grid gap-x-4 md:grid-cols-2 xl:grid-cols-3">
                <Form.Item
                  label="Tên biến thể"
                  required
                  validateStatus={variantForm.formState.errors.name ? 'error' : undefined}
                  help={variantForm.formState.errors.name?.message}
                >
                  <Controller name="name" control={variantForm.control} render={({ field }) => <Input {...field} placeholder="Ví dụ: Đen - Size 40" />} />
                </Form.Item>
                <Form.Item
                  label="SKU (mã hàng)"
                  extra="Bỏ trống để hệ thống tự sinh; không sửa được sau khi tạo."
                  validateStatus={variantForm.formState.errors.sku ? 'error' : undefined}
                  help={variantForm.formState.errors.sku?.message}
                >
                  <Controller
                    name="sku"
                    control={variantForm.control}
                    render={({ field }) => (
                      <Input {...field} placeholder="Bỏ trống để tự sinh" onChange={(event) => field.onChange(event.target.value.toUpperCase())} />
                    )}
                  />
                </Form.Item>
                <Form.Item
                  label="Barcode"
                  validateStatus={variantForm.formState.errors.barcode ? 'error' : undefined}
                  help={variantForm.formState.errors.barcode?.message}
                >
                  <Controller name="barcode" control={variantForm.control} render={({ field }) => <Input {...field} placeholder="Không bắt buộc" />} />
                </Form.Item>
                {DIMENSIONS.map(([name, label, min]) => (
                  <Form.Item
                    key={name}
                    label={label}
                    validateStatus={variantForm.formState.errors[name] ? 'error' : undefined}
                    help={variantForm.formState.errors[name]?.message}
                  >
                    <Controller
                      name={name}
                      control={variantForm.control}
                      render={({ field }) => (
                        <InputNumber
                          className="!w-full"
                          min={min}
                          precision={0}
                          value={field.value}
                          onBlur={field.onBlur}
                          onChange={(value) => field.onChange(value ?? undefined)}
                        />
                      )}
                    />
                  </Form.Item>
                ))}
              </div>
              <Button htmlType="submit" icon={<PlusOutlined />} loading={createVariant.isPending}>
                Thêm biến thể
              </Button>
            </Form>
          </PermissionGate>
        ) : (
          <Alert
            className="mt-4"
            type="info"
            showIcon
            message="Chỉ thêm biến thể khi sản phẩm ở trạng thái nháp"
            description="Sản phẩm đã xuất bản hoặc lưu trữ vẫn sửa được thông tin từng SKU và lịch giá."
          />
        )}
      </FormSection>

      <PermissionGate permission="catalog.price.view">
        <ProductPricePanel product={product} onChanged={onChanged} />
      </PermissionGate>

      <VariantEditDrawer variant={editingVariant} onClose={() => setEditingVariant(undefined)} onUpdated={onChanged} />
    </div>
  );
}
