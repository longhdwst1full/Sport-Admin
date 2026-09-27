import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Form, Input } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import {
  getListAdminBranchesQueryKey,
  getListAdminWarehousesQueryKey,
  useCreateAdminBranchWithWarehouse,
  useUpdateAdminBranchWithWarehouse,
} from '@/generated/api/organization/organization';
import type { BranchDto, WarehouseDto } from '@/generated/api/organization/organization.schemas';
import { getApiErrorMessage } from '@/lib/api/error';

interface OrganizationFormValues {
  branchCode: string;
  branchName: string;
  phone?: string;
  email?: string;
  addressLine: string;
  district: string;
  province: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
  latitude?: string;
  longitude?: string;
  warehouseCode: string;
  warehouseName: string;
}

const schema: yup.ObjectSchema<OrganizationFormValues> = yup.object({
  branchCode: yup.string().trim().matches(/^[A-Z0-9-]+$/, 'Mã chi nhánh không hợp lệ').required('Nhập mã chi nhánh'),
  branchName: yup.string().trim().required('Nhập tên chi nhánh'),
  phone: yup.string().trim().optional(),
  email: yup.string().trim().email('Email không hợp lệ').optional(),
  addressLine: yup.string().trim().required('Nhập địa chỉ'),
  district: yup.string().trim().required('Nhập quận/huyện'),
  province: yup.string().trim().required('Nhập tỉnh/thành phố'),
  provinceCode: yup.string().trim().optional(),
  // GHN dùng DistrictID dạng số và WardCode dạng chuỗi (có thể có chữ, ví dụ 1B2729).
  districtCode: yup.string().trim().matches(/^\d*$/, 'Mã quận GHN là số').optional(),
  wardCode: yup.string().trim().matches(/^[A-Za-z0-9]*$/, 'Mã phường GHN không hợp lệ').optional(),
  latitude: yup.string().trim().test('lat', 'Vĩ độ từ -90 đến 90', (v) => isCoordinate(v, 90)).optional(),
  longitude: yup.string().trim().test('lng', 'Kinh độ từ -180 đến 180', (v) => isCoordinate(v, 180)).optional(),
  warehouseCode: yup.string().trim().matches(/^[A-Z0-9-]+$/, 'Mã kho không hợp lệ').required('Nhập mã kho'),
  warehouseName: yup.string().trim().required('Nhập tên kho'),
});

const defaults: OrganizationFormValues = {
  branchCode: '',
  branchName: '',
  phone: '',
  email: '',
  addressLine: '',
  district: '',
  province: '',
  provinceCode: '',
  districtCode: '',
  wardCode: '',
  latitude: '',
  longitude: '',
  warehouseCode: '',
  warehouseName: '',
};

export function OrganizationFormDrawer({
  open,
  branch,
  warehouse,
  onClose,
}: {
  open: boolean;
  branch?: BranchDto;
  warehouse?: WarehouseDto;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const form = useForm<OrganizationFormValues>({ resolver: yupResolver(schema), defaultValues: defaults });
  const complete = async (label: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminBranchesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAdminWarehousesQueryKey() }),
    ]);
    void message.success(label);
    onClose();
  };
  const create = useCreateAdminBranchWithWarehouse({
    mutation: {
      onSuccess: () => complete('Đã tạo chi nhánh và kho.'),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo chi nhánh.')),
    },
  });
  const update = useUpdateAdminBranchWithWarehouse({
    mutation: {
      onSuccess: () => complete('Đã cập nhật chi nhánh và kho.'),
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể cập nhật chi nhánh.')),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      branch && warehouse
        ? {
            branchCode: branch.code,
            branchName: branch.name,
            phone: branch.phone ?? '',
            email: branch.email ?? '',
            addressLine: branch.address.addressLine,
            district: branch.address.district,
            province: branch.address.province,
            provinceCode: branch.address.provinceCode ?? '',
            districtCode: branch.address.districtCode ?? '',
            wardCode: branch.address.wardCode ?? '',
            latitude: branch.address.latitude?.toString() ?? '',
            longitude: branch.address.longitude?.toString() ?? '',
            warehouseCode: warehouse.code,
            warehouseName: warehouse.name,
          }
        : defaults,
    );
  }, [branch, form, open, warehouse]);

  const submit = form.handleSubmit((values) => {
    // CONTRACT: API ghi đè toàn bộ address; gửi đủ mã GHN và toạ độ để lần sửa tên/địa chỉ không xoá
    // mất dữ liệu mà phí GHN (from_district_id) và bán kính giao miễn phí cần.
    const optional = (value?: string) => (value?.trim() ? value.trim() : undefined);
    const address = {
      addressLine: values.addressLine,
      district: values.district,
      province: values.province,
      provinceCode: optional(values.provinceCode),
      districtCode: optional(values.districtCode),
      wardCode: optional(values.wardCode),
      latitude: optional(values.latitude) === undefined ? undefined : Number(values.latitude),
      longitude: optional(values.longitude) === undefined ? undefined : Number(values.longitude),
    };
    if (branch && warehouse) {
      update.mutate({
        id: branch.id,
        data: {
          name: values.branchName,
          ...(values.phone ? { phone: values.phone } : {}),
          ...(values.email ? { email: values.email } : {}),
          address,
          warehouse: { name: values.warehouseName },
          expectedVersion: branch.version,
          warehouseExpectedVersion: warehouse.version,
        },
      });
      return;
    }
    create.mutate({
      data: {
        code: values.branchCode,
        name: values.branchName,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.email ? { email: values.email } : {}),
        address,
        warehouse: { code: values.warehouseCode, name: values.warehouseName },
      },
    });
  });
  const pending = create.isPending || update.isPending;
  const field = (
    name: keyof OrganizationFormValues,
    label: string,
    options: { disabled?: boolean; required?: boolean } = {},
  ) => (
    <Form.Item
      label={label}
      required={options.required}
      validateStatus={form.formState.errors[name] ? 'error' : undefined}
      help={form.formState.errors[name]?.message}
    >
      <Controller name={name} control={form.control} render={({ field: input }) => <Input {...input} disabled={options.disabled} />} />
    </Form.Item>
  );

  return (
    <Drawer
      title={branch ? 'Cập nhật chi nhánh & kho' : 'Thêm chi nhánh & kho'}
      width={680}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={<Button type="primary" loading={pending} onClick={() => void submit()}>Lưu</Button>}
    >
      <Form layout="vertical" onFinish={() => void submit()}>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('branchCode', 'Mã chi nhánh', { disabled: Boolean(branch), required: true })}
          {field('branchName', 'Tên chi nhánh', { required: true })}
          {field('phone', 'Điện thoại')}
          {field('email', 'Email')}
        </div>
        {field('addressLine', 'Địa chỉ', { required: true })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('district', 'Quận/Huyện', { required: true })}
          {field('province', 'Tỉnh/Thành phố', { required: true })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {field('provinceCode', 'Mã tỉnh GHN')}
          {field('districtCode', 'Mã quận GHN (DistrictID)')}
          {field('wardCode', 'Mã phường GHN (WardCode)')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('latitude', 'Vĩ độ kho')}
          {field('longitude', 'Kinh độ kho')}
        </div>
        <TypographyTitle />
        <div className="grid gap-4 sm:grid-cols-2">
          {field('warehouseCode', 'Mã kho', { disabled: Boolean(branch), required: true })}
          {field('warehouseName', 'Tên kho', { required: true })}
        </div>
      </Form>
    </Drawer>
  );
}

function isCoordinate(value: string | undefined, limit: number) {
  if (!value?.trim()) return true;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit;
}

function TypographyTitle() {
  return <div className="mb-4 mt-2 border-t border-slate-200 pt-5 text-base font-semibold">Kho duy nhất của chi nhánh</div>;
}
