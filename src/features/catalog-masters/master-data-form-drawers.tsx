import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Form, Input, InputNumber, Select, Space } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { ENTITY_ID_PATTERN } from '../../lib/validation/entity-id';
import {
  getListAdminBrandsQueryKey,
  getListAdminCategoriesQueryKey,
  useCreateAdminBrand,
  useCreateAdminCategory,
  useUpdateAdminBrand,
  useUpdateAdminCategory,
} from '@/generated/api/catalog/catalog';
import type { BrandDto, CategoryDto } from '@/generated/api/catalog/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { toSlug } from '@/lib/utils/slug';

interface BrandFormValues {
  code: string;
  name: string;
  slug: string;
  description?: string;
}

interface CategoryFormValues extends BrandFormValues {
  parentId?: string;
  sortOrder: number;
}

const codeRule = /^[A-Z0-9-]+$/;
const slugRule = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const brandSchema: yup.ObjectSchema<BrandFormValues> = yup.object({
  code: yup.string().trim().matches(codeRule, 'Chỉ dùng chữ hoa, số và dấu gạch ngang (VD: NIKE-VN)').required('Nhập mã'),
  name: yup.string().trim().max(255).required('Nhập tên thương hiệu'),
  slug: yup.string().trim().matches(slugRule, 'Slug chỉ gồm chữ thường, số và gạch ngang (VD: nike-sport)').required('Nhập slug'),
  description: yup.string().trim().optional(),
});

const categorySchema: yup.ObjectSchema<CategoryFormValues> = brandSchema.shape({
  parentId: yup.string().matches(ENTITY_ID_PATTERN, 'Danh mục cha không hợp lệ').optional(),
  sortOrder: yup.number().integer().min(0).required('Nhập thứ tự hiển thị'),
});

const brandDefaults: BrandFormValues = { code: '', name: '', slug: '', description: '' };
const categoryDefaults: CategoryFormValues = { ...brandDefaults, parentId: undefined, sortOrder: 0 };

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-red-500 text-xs">{message}</span> : null;
}

export function BrandFormDrawer({
  open,
  brand,
  onClose,
}: {
  open: boolean;
  brand?: BrandDto;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const form = useForm<BrandFormValues>({ resolver: yupResolver(brandSchema), defaultValues: brandDefaults });
  const complete = async (label: string) => {
    await queryClient.invalidateQueries({ queryKey: getListAdminBrandsQueryKey() });
    void message.success(label);
    onClose();
  };
  const create = useCreateAdminBrand({
    mutation: {
      onSuccess: () => complete('Đã tạo thương hiệu mới thành công.'),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo thương hiệu.')),
    },
  });
  const update = useUpdateAdminBrand({
    mutation: {
      onSuccess: () => complete('Đã cập nhật thương hiệu thành công.'),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể cập nhật thương hiệu.')),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      brand
        ? { code: brand.code, name: brand.name, slug: brand.slug, description: brand.description ?? '' }
        : brandDefaults,
    );
  }, [brand, form, open]);

  const handleNameChange = (val: string) => {
    if (!brand && !form.getValues('slug')) {
      const generated = toSlug(val);
      form.setValue('slug', generated, { shouldValidate: true });
      if (!form.getValues('code')) {
        form.setValue('code', generated.toUpperCase().replace(/[^A-Z0-9-]/g, '-'), { shouldValidate: true });
      }
    }
  };

  const submit = form.handleSubmit((values) => {
    if (brand) {
      update.mutate({
        id: brand.id,
        data: {
          name: values.name,
          slug: values.slug,
          ...(values.description ? { description: values.description } : {}),
          expectedVersion: brand.version,
        },
      });
      return;
    }
    create.mutate({ data: values });
  });
  const pending = create.isPending || update.isPending;

  return (
    <Drawer
      title={brand ? 'Cập nhật thương hiệu' : 'Thêm thương hiệu mới'}
      width={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} className="!rounded-xl">
            Hủy
          </Button>
          <Button
            type="primary"
            loading={pending}
            onClick={() => void submit()}
            className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-500 !font-semibold !px-5"
          >
            {pending ? 'Đang lưu...' : 'Lưu thương hiệu'}
          </Button>
        </div>
      }
    >
      <Form layout="vertical" onFinish={() => void submit()}>
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Tên thương hiệu</span>}
          required
          validateStatus={form.formState.errors.name ? 'error' : undefined}
          help={<FieldError message={form.formState.errors.name?.message} />}
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Ví dụ: Nike, Adidas, Lining..."
                className="!rounded-lg"
                onChange={(e) => {
                  field.onChange(e);
                  handleNameChange(e.target.value);
                }}
              />
            )}
          />
        </Form.Item>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Mã thương hiệu</span>}
            required
            validateStatus={form.formState.errors.code ? 'error' : undefined}
            help={<FieldError message={form.formState.errors.code?.message} />}
          >
            <Controller
              name="code"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="NIKE-VN"
                  disabled={Boolean(brand)}
                  className="!rounded-lg uppercase font-mono"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Slug đường dẫn</span>}
            required
            validateStatus={form.formState.errors.slug ? 'error' : undefined}
            help={<FieldError message={form.formState.errors.slug?.message} />}
          >
            <Controller
              name="slug"
              control={form.control}
              render={({ field }) => (
                <Input {...field} placeholder="nike-viet-nam" className="!rounded-lg font-mono text-xs" />
              )}
            />
          </Form.Item>
        </div>

        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Mô tả giới thiệu</span>}
        >
          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                rows={4}
                placeholder="Giới thiệu xuất xứ, thế mạnh thương hiệu..."
                className="!rounded-lg"
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

export function CategoryFormDrawer({
  open,
  category,
  categories,
  onClose,
}: {
  open: boolean;
  category?: CategoryDto;
  categories: CategoryDto[];
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const form = useForm<CategoryFormValues>({ resolver: yupResolver(categorySchema), defaultValues: categoryDefaults });
  const complete = async (label: string) => {
    await queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });
    void message.success(label);
    onClose();
  };
  const create = useCreateAdminCategory({
    mutation: {
      onSuccess: () => complete('Đã tạo danh mục mới thành công.'),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo danh mục.')),
    },
  });
  const update = useUpdateAdminCategory({
    mutation: {
      onSuccess: () => complete('Đã cập nhật danh mục thành công.'),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể cập nhật danh mục.')),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      category
        ? {
            code: category.code,
            name: category.name,
            slug: category.slug,
            description: category.description ?? '',
            parentId: category.parentId,
            sortOrder: category.sortOrder,
          }
        : categoryDefaults,
    );
  }, [category, form, open]);

  const handleNameChange = (val: string) => {
    if (!category && !form.getValues('slug')) {
      const generated = toSlug(val);
      form.setValue('slug', generated, { shouldValidate: true });
      if (!form.getValues('code')) {
        form.setValue('code', generated.toUpperCase().replace(/[^A-Z0-9-]/g, '-'), { shouldValidate: true });
      }
    }
  };

  const submit = form.handleSubmit((values) => {
    if (category) {
      update.mutate({
        id: category.id,
        data: {
          name: values.name,
          slug: values.slug,
          ...(values.description ? { description: values.description } : {}),
          sortOrder: values.sortOrder,
          expectedVersion: category.version,
        },
      });
      return;
    }
    create.mutate({
      data: {
        code: values.code,
        name: values.name,
        slug: values.slug,
        ...(values.description ? { description: values.description } : {}),
        ...(values.parentId ? { parentId: values.parentId } : {}),
        sortOrder: values.sortOrder,
      },
    });
  });
  const pending = create.isPending || update.isPending;

  return (
    <Drawer
      title={category ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
      width={560}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} className="!rounded-xl">
            Hủy
          </Button>
          <Button
            type="primary"
            loading={pending}
            onClick={() => void submit()}
            className="!rounded-xl !bg-emerald-600 hover:!bg-emerald-500 !font-semibold !px-5"
          >
            {pending ? 'Đang lưu...' : 'Lưu danh mục'}
          </Button>
        </div>
      }
    >
      <Form layout="vertical" onFinish={() => void submit()}>
        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Tên danh mục</span>}
          required
          validateStatus={form.formState.errors.name ? 'error' : undefined}
          help={<FieldError message={form.formState.errors.name?.message} />}
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Ví dụ: Giày đá bóng sân cỏ nhân tạo..."
                className="!rounded-lg"
                onChange={(e) => {
                  field.onChange(e);
                  handleNameChange(e.target.value);
                }}
              />
            )}
          />
        </Form.Item>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Mã danh mục</span>}
            required
            validateStatus={form.formState.errors.code ? 'error' : undefined}
            help={<FieldError message={form.formState.errors.code?.message} />}
          >
            <Controller
              name="code"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="GIAY-BONG-DA"
                  disabled={Boolean(category)}
                  className="!rounded-lg uppercase font-mono"
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Slug đường dẫn</span>}
            required
            validateStatus={form.formState.errors.slug ? 'error' : undefined}
            help={<FieldError message={form.formState.errors.slug?.message} />}
          >
            <Controller
              name="slug"
              control={form.control}
              render={({ field }) => (
                <Input {...field} placeholder="giay-bong-da" className="!rounded-lg font-mono text-xs" />
              )}
            />
          </Form.Item>
        </div>

        {!category && (
          <Form.Item
            label={<span className="text-xs font-semibold text-slate-700">Danh mục cha (Cấp trên)</span>}
            help={<span className="text-xs text-slate-400">Để trống nếu đây là danh mục gốc cao nhất.</span>}
          >
            <Controller
              name="parentId"
              control={form.control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  placeholder="Chọn danh mục cha nếu có"
                  className="w-full"
                  options={categories
                    .filter((item) => item.status === 'ACTIVE')
                    .map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))}
                />
              )}
            />
          </Form.Item>
        )}

        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Thứ tự hiển thị</span>}
          required
        >
          <Controller
            name="sortOrder"
            control={form.control}
            render={({ field }) => <InputNumber {...field} min={0} className="w-full !rounded-lg" />}
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-xs font-semibold text-slate-700">Mô tả danh mục</span>}
        >
          <Controller
            name="description"
            control={form.control}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                rows={3}
                placeholder="Mô tả danh mục hiển thị trên website..."
                className="!rounded-lg"
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
