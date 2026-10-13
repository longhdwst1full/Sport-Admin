import { yupResolver } from '@hookform/resolvers/yup';
import { BarcodeOutlined, CheckCircleOutlined, EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { PermissionGate } from '@/core/auth/permissions';
import { FormSection } from '@/foundation/layout/form-section';
import { AdminTable, col, TableActionButton } from '@/foundation/table';
import {
  useArchiveAdminProductVariant,
  useCreateAdminProductVariant,
  useReactivateAdminProductVariant,
} from '@/generated/api/catalog/catalog';
import { ProductType, type ProductVariantDto, type ProductVariantStatus } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatMoney } from '@/lib/format/money';
import { VARIANT_DIMENSION_FIELDS } from '../../constants/product-list.constants';
import { PRODUCT_VARIANT_STATUS_PRESENTATION } from '../../constants/product-status.constants';
import { VARIANT_FIELD_RULES } from '../../model/product-form.schema';
import { toCreateVariantDto, type VariantFieldValues } from '../../model/variant-edit.mapper';
import { ProductPricePanel } from '../product-price-panel';
import { VariantEditDrawer } from '../variant-edit-drawer';
import { FieldItem, SkuInput, VariantNumberInput } from './form-field-parts';
import type { ProductPanelProps } from './types';

/** Cùng luật với ô biến thể của form Tạo, để thêm SKU sau này không dễ hơn/khó hơn lúc tạo. */
const newVariantSchema: yup.ObjectSchema<VariantFieldValues> = yup.object(VARIANT_FIELD_RULES);

const emptyNewVariant: VariantFieldValues = { name: '', sku: '', barcode: '', weightGrams: 0 };

/**
 * Khối SKU & giá (tab "SKU, giá & tồn kho") ở chế độ Sửa — SKU thật của sản phẩm và lịch giá. Thành phần combo ở khối Combo cùng tab.
 *
 * Mỗi thao tác ở đây ghi ngay qua operation riêng (có `expectedVersion` của SKU/giá), không đi qua nút
 * Lưu của form: SKU có vòng đời riêng và giá là lịch bất biến, không thể "sửa nháp rồi lưu một lần".
 */
export function ProductVariantsManager({ product, onChanged }: ProductPanelProps) {
  const { message, modal } = App.useApp();
  const [editingVariant, setEditingVariant] = useState<ProductVariantDto>();
  const isDraft = product.status === 'DRAFT';
  const isArchived = product.status === 'ARCHIVED';
  const isBundle = product.productType === ProductType.BUNDLE;

  const lifecycleMutation = (success: string, failure: string) => ({
    mutation: {
      onSuccess: async () => {
        await onChanged();
        void message.success(success);
      },
      onError: (error: unknown) => void message.error(getApiErrorMessage(error, failure)),
    },
  });
  const archiveVariant = useArchiveAdminProductVariant(lifecycleMutation('Đã lưu trữ SKU.', 'Không lưu trữ được SKU.'));
  const reactivateVariant = useReactivateAdminProductVariant(lifecycleMutation('Đã kích hoạt lại SKU.', 'Không thể kích hoạt lại SKU.'));

  // UX: chỉ dòng đang chạy lệnh hiện loading, không phải mọi dòng của bảng.
  const lifecycleBusyId = archiveVariant.isPending
    ? archiveVariant.variables?.variantId
    : reactivateVariant.isPending
      ? reactivateVariant.variables?.variantId
      : undefined;

  const confirmVariantLifecycle = (variant: ProductVariantDto) => {
    const isActive = variant.status === 'ACTIVE';
    modal.confirm({
      title: `${isActive ? 'Lưu trữ' : 'Kích hoạt lại'} SKU “${variant.sku}”?`,
      content: isActive
        ? 'SKU sẽ không còn được bán mới. Nếu SKU đang là thành phần của combo đã xuất bản, hệ thống sẽ từ chối để combo không mất thành phần.'
        : 'SKU chỉ được kích hoạt lại khi sản phẩm chưa bị lưu trữ.',
      okText: isActive ? 'Lưu trữ SKU' : 'Kích hoạt lại',
      okButtonProps: { danger: isActive },
      cancelText: 'Huỷ',
      onOk: () => isActive
        ? archiveVariant.mutateAsync({ variantId: variant.id, data: { expectedVersion: variant.version } })
        : reactivateVariant.mutateAsync({ variantId: variant.id, data: { expectedVersion: variant.version } }),
    });
  };

  // Cột phụ thuộc trạng thái sản phẩm và các mutation của khối này nên dựng lại mỗi render, không memo.
  const variantColumns: ColumnsType<ProductVariantDto> = [
    col.text<ProductVariantDto>('sku', 'SKU'),
    col.text<ProductVariantDto>('name', 'Tên biến thể'),
    col.text<ProductVariantDto>('barcode', 'Barcode'),
    col.status<ProductVariantDto, ProductVariantStatus>('status', 'Trạng thái', PRODUCT_VARIANT_STATUS_PRESENTATION, { width: undefined }),
    {
      title: 'Giá đã VAT',
      dataIndex: 'effectivePrice',
      align: 'right',
      render: (value?: string | null) => (value ? formatMoney(value) : <Tag color="orange">Chưa có giá</Tag>),
    },
    ...(isBundle
      ? [{
          title: 'Combo',
          key: 'bundle',
          render: (_: unknown, variant: ProductVariantDto) =>
            variant.bundle ? `${variant.bundle.components.length} thành phần` : <Tag color="orange">Chưa khai</Tag>,
        }]
      : []),
    col.actions<ProductVariantDto>(
      (variant) => (
        <PermissionGate permission="catalog.product.manage">
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
            loading={lifecycleBusyId === variant.id}
            onClick={() => confirmVariantLifecycle(variant)}
          />
        </PermissionGate>
      ),
      { title: '', width: 100 },
    ),
  ];

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
          columns={variantColumns}
        />

        {isDraft ? (
          <PermissionGate permission="catalog.product.manage">
            <NewVariantForm productId={product.id} onCreated={onChanged} />
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

/** Thêm một SKU vào sản phẩm nháp (`createAdminProductVariant`); lưu ngay, không đi qua nút Lưu của form. */
function NewVariantForm({ productId, onCreated }: { productId: string; onCreated: () => Promise<void> }) {
  const { message } = App.useApp();
  const variantForm = useForm<VariantFieldValues>({ resolver: yupResolver(newVariantSchema), defaultValues: emptyNewVariant });
  const errors = variantForm.formState.errors;
  const createVariant = useCreateAdminProductVariant({
    mutation: {
      onSuccess: async () => {
        await onCreated();
        variantForm.reset(emptyNewVariant);
        void message.success('Đã thêm SKU. Đặt giá cho SKU ở khối lịch giá bên dưới.');
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể thêm SKU.')),
    },
  });
  const submit = variantForm.handleSubmit((values) => createVariant.mutate({ id: productId, data: toCreateVariantDto(values) }));

  return (
    <Form layout="vertical" className="mt-4 rounded-xl border border-dashed border-slate-300 p-4" onFinish={() => void submit()}>
      <div className="mb-3 text-sm font-semibold text-slate-700">Thêm biến thể</div>
      <div className="grid gap-x-4 md:grid-cols-2 xl:grid-cols-3">
        <FieldItem label="Tên biến thể" required error={errors.name}>
          <Controller name="name" control={variantForm.control} render={({ field }) => <Input {...field} maxLength={255} placeholder="Ví dụ: Đen - Size 40" />} />
        </FieldItem>
        <FieldItem label="SKU (mã hàng)" extra="Bỏ trống để hệ thống tự sinh; không sửa được sau khi tạo." error={errors.sku}>
          <Controller name="sku" control={variantForm.control} render={({ field }) => <SkuInput {...field} />} />
        </FieldItem>
        <FieldItem label="Barcode" error={errors.barcode}>
          <Controller name="barcode" control={variantForm.control} render={({ field }) => <Input {...field} maxLength={64} placeholder="Không bắt buộc" />} />
        </FieldItem>
        {VARIANT_DIMENSION_FIELDS.map(([name, label, min]) => (
          <FieldItem key={name} label={label} error={errors[name]}>
            <Controller
              name={name}
              control={variantForm.control}
              render={({ field }) => (
                <VariantNumberInput min={min} value={field.value} onBlur={field.onBlur} onChange={field.onChange} />
              )}
            />
          </FieldItem>
        ))}
      </div>
      <Button htmlType="submit" icon={<PlusOutlined />} loading={createVariant.isPending}>
        Thêm biến thể
      </Button>
    </Form>
  );
}
