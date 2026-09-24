import { Alert, Descriptions, Empty, Tag, Typography } from 'antd';
import type { UseFormReturn } from 'react-hook-form';
import { ProductType } from '@/generated/api/catalog/models';
import { AdminTable } from '@/foundation/table';
import type { ProductFormValues } from '../../model/product-form.mapper';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

/**
 * Tab 4 — đọc lại trước khi tạo.
 *
 * Đọc từ `watch()` chứ không giữ bản sao riêng: bản tóm tắt phải là đúng thứ sắp được gửi đi, không
 * phải ảnh chụp của lần chuyển tab gần nhất.
 */
export function ProductReviewTab({
  form,
  brandLabel,
  categoryLabels,
  branchLabel,
}: {
  form: UseFormReturn<ProductFormValues>;
  brandLabel?: string;
  categoryLabels: string[];
  branchLabel?: string;
}) {
  const values = form.watch();
  const variants = values.variants ?? [];
  const unpriced = variants.filter((variant) => !variant.price?.trim());
  const openingTotal = variants.reduce((total, variant) => total + (variant.openingQuantity || 0), 0);

  return (
    <div className="space-y-4">
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
        <Descriptions.Item label="Ảnh">
          {values.images?.length ? `${values.images.length} ảnh` : 'Chưa có ảnh'}
        </Descriptions.Item>
        <Descriptions.Item label="Mã sản phẩm và đường dẫn">
          <Typography.Text type="secondary">Hệ thống tự sinh sau khi lưu</Typography.Text>
        </Descriptions.Item>
      </Descriptions>

      <div>
        <Typography.Title level={5}>Biến thể sẽ được tạo</Typography.Title>
        {variants.length === 0 ? (
          <Empty description="Chưa khai biến thể nào" />
        ) : (
          <AdminTable
            size="small"
            rowKey={(_row, index) => String(index)}
            pagination={false}
            dataSource={variants}
            columns={[
              { title: 'SKU', width: 110, render: () => <Typography.Text type="secondary">Tự sinh</Typography.Text> },
              { title: 'Tên biến thể', dataIndex: 'name', render: (value: string) => value || '—' },
              { title: 'Barcode', dataIndex: 'barcode', width: 140, render: (value?: string) => value || '—' },
              {
                title: 'Giá bán',
                dataIndex: 'price',
                width: 150,
                align: 'right' as const,
                render: (value?: string) =>
                  value?.trim() ? money.format(Number(value)) : <Tag color="orange">Chưa có giá</Tag>,
              },
              {
                title: 'Tồn đầu',
                dataIndex: 'openingQuantity',
                width: 100,
                align: 'right' as const,
              },
            ]}
          />
        )}
      </div>

      {unpriced.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Có biến thể chưa khai giá"
          description="Sản phẩm vẫn tạo được và nằm ở trạng thái nháp, nhưng chỉ xuất bản được khi mọi SKU đang bán đã có giá hiệu lực."
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
