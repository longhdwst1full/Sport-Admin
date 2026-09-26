import { FileImageOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { FormSection } from '@/foundation/layout/form-section';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';
import { ProductImagePicker } from '../product-image-picker';
import { ProductMediaPanel } from '../product-media-panel';
import type { ProductFormValues } from '../../model/product-form.mapper';

/**
 * Khối Hình ảnh của tab Thông tin.
 *
 * Cùng một khối ở Tạo và Sửa. Khi Tạo, ảnh là một ô của form và gắn trong lệnh tạo. Khi Sửa, ảnh do
 * `ProductMediaPanel` ghi ngay qua API media (mỗi thao tác có `expectedProductVersion`), vì ảnh đã tải
 * lên Cloudinary không "nháp" được tới lúc bấm Lưu.
 */
export function ProductMediaTab({
  form,
  product,
  disabled,
  onMediaChanged,
}: {
  form: UseFormReturn<ProductFormValues>;
  /** Có khi Sửa. */
  product?: ProductDetailDto;
  disabled: boolean;
  onMediaChanged: () => Promise<void>;
}) {
  const mutationPending = disabled;
  return (
    <FormSection
        title="Hình ảnh"
        description="Ảnh đầu danh sách là ảnh chính, hiển thị ở danh sách sản phẩm và trang chi tiết."
        icon={<FileImageOutlined />}
      >
{product ? (
    <ProductMediaPanel product={product} onChanged={onMediaChanged} />
  ) : (
    <Form.Item
      label="Ảnh sản phẩm"
      extra="Tải nhiều ảnh ngay tại đây; ảnh đầu danh sách là ảnh chính. Ảnh được gắn vào sản phẩm sau khi tạo."
    >
      <Controller
        name="images"
        control={form.control}
        render={({ field }) => (
          <ProductImagePicker
            value={field.value ?? []}
            disabled={mutationPending}
            onChange={field.onChange}
          />
        )}
      />
    </Form.Item>
  )}

    </FormSection>
  );
}
