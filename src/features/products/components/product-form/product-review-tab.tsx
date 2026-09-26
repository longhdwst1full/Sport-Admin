import { Alert, Descriptions, Empty, Tag, Typography } from 'antd';
import type { UseFormReturn } from 'react-hook-form';
import { ProductType, type ProductDetailDto, type ProductSetupStatusDto } from '@/generated/api/catalog/catalog.schemas';
import { AdminTable } from '@/foundation/table';
import { PRODUCT_READINESS_LABEL } from '../../constants/product-list.constants';
import type { ProductFormValues } from '../../model/product-form.mapper';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

interface ReviewVariantRow {
  key: string;
  sku?: string;
  name: string;
  barcode?: string;
  price?: string | null;
  openingQuantity?: number;
  status?: string;
}

/**
 * Tab 5 — đọc lại trước khi lưu, cùng bố cục ở Tạo và Sửa.
 *
 * Thông tin, mô tả và thông số đọc từ `watch()` — đúng thứ sắp gửi đi. Khi Sửa, biến thể/ảnh là dữ liệu
 * đã lưu (`product`) và có thêm checklist xuất bản từ API (`readiness`, cùng policy với publish).
 */
export function ProductReviewTab({
  form,
  brandLabel,
  categoryLabels,
  branchLabel,
  product,
  readiness,
}: {
  form: UseFormReturn<ProductFormValues>;
  brandLabel?: string;
  categoryLabels: string[];
  branchLabel?: string;
  product?: ProductDetailDto;
  readiness?: ProductSetupStatusDto;
}) {
  const values = form.watch();
  const formVariants = values.variants ?? [];
  const specificationCount = (values.specifications ?? []).filter(({ code }) => code).length;
  const rows: ReviewVariantRow[] = product
    ? product.variants.map((variant) => ({
        key: variant.id,
        sku: variant.sku,
        name: variant.name,
        barcode: variant.barcode,
        price: variant.effectivePrice,
        status: variant.status,
      }))
    : formVariants.map((variant, index) => ({
        key: String(index),
        name: variant.name,
        barcode: variant.barcode,
        price: variant.price?.trim() || undefined,
        openingQuantity: variant.openingQuantity,
      }));
  const unpriced = rows.filter((row) => !row.price);
  const openingTotal = product ? 0 : formVariants.reduce((total, variant) => total + (variant.openingQuantity || 0), 0);
  const imageCount = product ? product.media.length : values.images?.length ?? 0;

  return (
    <div className="space-y-4">
      {product && readiness && (
        readiness.blockingIssues.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message={product.status === 'DRAFT' ? 'Chưa xuất bản được' : 'Sản phẩm đang thiếu điều kiện bán'}
            description={(
              <ul className="m-0 pl-4">
                {readiness.blockingIssues.map(({ code }) => <li key={code}>{PRODUCT_READINESS_LABEL[code] ?? code}</li>)}
              </ul>
            )}
          />
        ) : (
          <Alert type="success" showIcon message="Đủ điều kiện xuất bản" />
        )
      )}
      {product && readiness && readiness.warnings.length > 0 && (
        <Alert type="info" showIcon message={readiness.warnings.map(({ code }) => PRODUCT_READINESS_LABEL[code] ?? code).join(' · ')} />
      )}

      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Tên sản phẩm">
          {values.name?.trim() || <Typography.Text type="secondary">Chưa nhập</Typography.Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Loại">
          {values.productType === ProductType.BUNDLE ? 'Combo cố định' : 'Sản phẩm thường'}
        </Descriptions.Item>
        <Descriptions.Item label="Thương hiệu">
          {brandLabel ?? <Typography.Text type="secondary">Chưa chọn</Typography.Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Danh mục">
          {categoryLabels.length > 0 ? (
            categoryLabels.map((label) => <Tag key={label}>{label}</Tag>)
          ) : (
            <Typography.Text type="secondary">Chưa chọn</Typography.Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Ảnh">{imageCount ? `${imageCount} ảnh` : 'Chưa có ảnh'}</Descriptions.Item>
        <Descriptions.Item label="Thông số kỹ thuật">
          {specificationCount ? `${specificationCount} thông số` : <Typography.Text type="secondary">Chưa nhập</Typography.Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Mã sản phẩm và đường dẫn">
          {product ? `${product.productNo} · /${product.slug}` : <Typography.Text type="secondary">Hệ thống tự sinh sau khi lưu</Typography.Text>}
        </Descriptions.Item>
      </Descriptions>

      <div>
        <Typography.Title level={5}>{product ? 'Biến thể hiện có' : 'Biến thể sẽ được tạo'}</Typography.Title>
        {rows.length === 0 ? (
          <Empty description="Chưa khai biến thể nào" />
        ) : (
          <AdminTable<ReviewVariantRow>
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={rows}
            columns={[
              {
                title: 'SKU',
                dataIndex: 'sku',
                width: 130,
                render: (value?: string) => value || <Typography.Text type="secondary">Tự sinh</Typography.Text>,
              },
              { title: 'Tên biến thể', dataIndex: 'name', render: (value: string) => value || '—' },
              { title: 'Barcode', dataIndex: 'barcode', width: 140, render: (value?: string) => value || '—' },
              {
                title: 'Giá bán',
                dataIndex: 'price',
                width: 150,
                align: 'right' as const,
                render: (value?: string | null) => (value ? money.format(Number(value)) : <Tag color="orange">Chưa có giá</Tag>),
              },
              product
                ? { title: 'Trạng thái', dataIndex: 'status', width: 110, render: (value: string) => <Tag>{value}</Tag> }
                : { title: 'Tồn đầu', dataIndex: 'openingQuantity', width: 100, align: 'right' as const },
            ]}
          />
        )}
      </div>

      {unpriced.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Có biến thể chưa có giá"
          description="Sản phẩm chỉ xuất bản được khi SKU đang bán đã có giá hiệu lực. Đặt giá ở tab Biến thể & giá."
        />
      )}

      {openingTotal > 0 && (
        <Alert
          type="info"
          showIcon
          message={`Sẽ ghi ${openingTotal} sản phẩm tồn đầu${branchLabel ? ` tại ${branchLabel}` : ''}`}
          description="Tồn đầu được ghi bằng một phiếu điều chỉnh kho riêng ngay sau khi tạo sản phẩm, nên tra lại được vì sao kho có số lượng này."
        />
      )}
    </div>
  );
}
