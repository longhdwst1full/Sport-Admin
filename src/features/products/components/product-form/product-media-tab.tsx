import { FileImageOutlined, FileTextOutlined } from '@ant-design/icons';
import { Form, Input } from 'antd';
import { FormSection } from '@/foundation/layout/form-section';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { RichTextEditor } from '@/foundation/inputs/rich-text-editor';
import { ProductImagePicker } from '../product-image-picker';
import type { ProductFormValues } from '../../model/product-form.mapper';

/**
 * Tab 2 — ảnh và mô tả.
 *
 * Ở chế độ Sửa, ảnh do `ProductMediaPanel` quản lý trực tiếp qua API media (có version riêng), nên
 * ô tải ảnh của form chỉ xuất hiện khi tạo mới.
 */
export function ProductMediaTab({
  form,
  isEdit,
  disabled,
}: {
  form: UseFormReturn<ProductFormValues>;
  isEdit: boolean;
  disabled: boolean;
}) {
  const mutationPending = disabled;
  return (
    <div className="space-y-4">
      <FormSection
        title="Hình ảnh"
        description="Ảnh đầu danh sách là ảnh chính, hiển thị ở danh sách sản phẩm và trang chi tiết."
        icon={<FileImageOutlined />}
      >
{!isEdit && (
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

      <FormSection
        title="Mô tả"
        description="Mô tả ngắn hiện ở thẻ sản phẩm; mô tả chi tiết hiện trong trang sản phẩm."
        icon={<FileTextOutlined />}
      >
        <Form.Item label="Mô tả ngắn">
    <Controller name="shortDescription" control={form.control} render={({ field }) => <Input {...field} />} />
  </Form.Item>
  <Form.Item
    label="Mô tả chi tiết"
  >
    <Controller
      name="description"
      control={form.control}
      render={({ field }) => (
        <RichTextEditor
          value={field.value}
          onChange={field.onChange}
          placeholder="Nhập mô tả, thông số và hướng dẫn sử dụng sản phẩm..."
        />
      )}
    />
  </Form.Item>
      </FormSection>
    </div>
  );
}
