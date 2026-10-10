import type { FieldPath } from 'react-hook-form';
import * as yup from 'yup';
import { ProductType } from '@/generated/api/catalog/catalog.schemas';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import { SKU_PATTERN, SKU_PATTERN_MESSAGE } from '../constants/product-list.constants';
import { emptyVariant, type ProductFormValues } from './product-form.mapper';
import { INITIAL_PRICE_PATTERN } from './product-initial-setup';

export const productFormSchema: yup.ObjectSchema<ProductFormValues> = yup.object({
  productType: yup
    .mixed<ProductType>()
    .oneOf(Object.values(ProductType))
    .required('Chọn loại sản phẩm'),
  name: yup.string().trim().required('Nhập tên sản phẩm').max(255, 'Tối đa 255 ký tự'),
  brandId: yup.string().matches(ENTITY_ID_PATTERN, 'Thương hiệu không hợp lệ').optional(),
  categoryIds: yup.array().of(yup.string().matches(ENTITY_ID_PATTERN, 'Danh mục không hợp lệ').required()).min(1, 'Chọn ít nhất một danh mục').required(),
  primaryCategoryId: yup
    .string()
    .matches(ENTITY_ID_PATTERN, 'Danh mục chính không hợp lệ')
    .required('Chọn danh mục chính')
    .test('selected-category', 'Danh mục chính phải nằm trong danh mục đã chọn', function (value) {
      return Boolean(value && (this.parent.categoryIds ?? []).includes(value));
    }),
  shortDescription: yup.string().trim().max(1000, 'Tối đa 1000 ký tự').optional(),
  description: yup.string().trim().optional(),
  initialBranchId: yup.string().matches(ENTITY_ID_PATTERN, 'Chi nhánh không hợp lệ').optional(),
  initialWarehouseCode: yup.string().trim().optional().test(
    'opening-stock-location',
    'Chọn chi nhánh và kho khi nhập số lượng tồn đầu',
    function validateOpeningStockLocation(value) {
      const values = this.parent as ProductFormValues;
      const hasOpeningStock = values.variants.some(({ openingQuantity }) => openingQuantity > 0);
      return !hasOpeningStock || Boolean(values.initialBranchId && value);
    },
  ),
  images: yup.array().of(yup.object({ assetId: yup.string().required(), url: yup.string().required() })).default([]),
  // Kiểu giá trị theo từng thuộc tính cần từ điển nên kiểm ở `toSpecificationPayload` lúc submit.
  specifications: yup
    .array()
    .of(yup.object({ code: yup.string().defined(), values: yup.array().of(yup.string().required()).required() }))
    .required(),
  variants: yup
    .array()
    .of(yup.object({
      name: yup.string().trim().required('Nhập tên biến thể').max(255, 'Tối đa 255 ký tự'),
      sku: yup.string().trim().uppercase().test('sku-pattern', SKU_PATTERN_MESSAGE, (value) => !value || SKU_PATTERN.test(value)).optional(),
      barcode: yup.string().trim().max(64, 'Tối đa 64 ký tự').optional(),
      weightGrams: yup.number().integer('Khối lượng phải là số nguyên').min(0, 'Tối thiểu 0').optional(),
      lengthMm: yup.number().integer('Chiều dài phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      widthMm: yup.number().integer('Chiều rộng phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      heightMm: yup.number().integer('Chiều cao phải là số nguyên').min(1, 'Tối thiểu 1 mm').optional(),
      openingQuantity: yup.number()
        .integer('Số lượng phải là số nguyên')
        .min(0, 'Số lượng không được âm')
        .required('Nhập số lượng tồn đầu'),
      // CONTRACT: cùng regex với `initialPriceAmount` của API; sai định dạng thì chặn ở đây thay vì để API
      // từ chối cả lệnh tạo.
      price: yup.string().trim().optional().test(
        'price-format',
        'Giá phải lớn hơn 0, tối đa 2 chữ số thập phân',
        (value) => !value || INITIAL_PRICE_PATTERN.test(value),
      ),
    }))
    .min(1, 'Cần ít nhất một biến thể')
    .max(50, 'Tối đa 50 biến thể mỗi lần tạo')
    .required(),
});

export const PRODUCT_FORM_DEFAULTS: ProductFormValues = {
  productType: ProductType.STANDARD,
  name: '',
  brandId: undefined,
  categoryIds: [],
  primaryCategoryId: '',
  shortDescription: '',
  description: '',
  initialBranchId: undefined,
  initialWarehouseCode: undefined,
  images: [],
  specifications: [],
  variants: [emptyVariant()],
};

/** Tên trường lỗi của API → ô của form (khác tên ở đúng một chỗ). */
const API_VARIANT_FIELD: Record<string, string> = { initialPriceAmount: 'price' };
const VARIANT_FORM_FIELD = /^(name|sku|barcode|weightGrams|lengthMm|widthMm|heightMm|openingQuantity|price)$/;

export type ProductApiFieldTarget =
  | { kind: 'field'; path: FieldPath<ProductFormValues> }
  | { kind: 'specification' };

/**
 * CONTRACT: đường dẫn lỗi trường của API (`variants.0.initialPriceAmount`, `specifications.…`, `name`)
 * → chỗ hiển thị trên form; trường form không có thì trả `undefined` (chỉ còn toast chung).
 */
export function toProductFormErrorTarget(field: string): ProductApiFieldTarget | undefined {
  const variantField = /^variants\.(\d+)\.(\w+)$/.exec(field);
  if (variantField) {
    const name = API_VARIANT_FIELD[variantField[2]] ?? variantField[2];
    return VARIANT_FORM_FIELD.test(name)
      ? { kind: 'field', path: `variants.${Number(variantField[1])}.${name}` as FieldPath<ProductFormValues> }
      : undefined;
  }
  if (field.startsWith('specifications')) return { kind: 'specification' };
  return field in productFormSchema.fields ? { kind: 'field', path: field as FieldPath<ProductFormValues> } : undefined;
}
