import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { App, Form, Input, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useController, useForm, type Control } from 'react-hook-form';
import * as yup from 'yup';
import { CACHE_POLICY } from '@/shared/constants/query-cache-policy';
import {
  useListShippingDistricts,
  useListShippingProvinces,
} from '@/generated/api/shipping/shipping';
import {
  getListAdminBranchesQueryKey,
  getListAdminWarehousesQueryKey,
  useCreateAdminBranchWithWarehouse,
  useUpdateAdminBranchWithWarehouse,
} from '@/generated/api/organization/organization';
import type { BranchDto, WarehouseDto } from '@/generated/api/organization/organization.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { FormDrawer } from '@/foundation/overlay';

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
  freeDeliveryDistrictCodes: string[];
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
  // CONTRACT: server nhận tối đa 100 GHN DistrictID dạng chuỗi số; ràng buộc ở đây phải khớp để
  // admin thấy lỗi ngay thay vì nhận 400 từ API.
  freeDeliveryDistrictCodes: yup
    .array()
    .of(yup.string().trim().matches(/^\d{1,32}$/, 'Mã quận GHN là số').required())
    .max(100, 'Tối đa 100 quận/huyện')
    .default([])
    .required(),
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
  freeDeliveryDistrictCodes: [],
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
            freeDeliveryDistrictCodes: branch.freeDeliveryDistrictCodes ?? [],
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
    // CONTRACT: bỏ trống field này khi update nghĩa là "giữ nguyên danh sách cũ", nên luôn gửi mảng
    // tường minh — kể cả mảng rỗng — để admin có thể xoá hết quận/huyện giao miễn phí.
    const freeDeliveryDistrictCodes = values.freeDeliveryDistrictCodes ?? [];
    if (branch && warehouse) {
      update.mutate({
        id: branch.id,
        data: {
          name: values.branchName,
          freeDeliveryDistrictCodes,
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
        freeDeliveryDistrictCodes,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.email ? { email: values.email } : {}),
        address,
        warehouse: { code: values.warehouseCode, name: values.warehouseName },
      },
    });
  });
  const branchProvinceCode = form.watch('provinceCode');
  const pending = create.isPending || update.isPending;
  const { isDirty } = form.formState;
  const field = (
    name: Exclude<keyof OrganizationFormValues, 'freeDeliveryDistrictCodes'>,
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
    <FormDrawer
      title={branch ? 'Cập nhật chi nhánh & kho' : 'Thêm chi nhánh & kho'}
      open={open}
      onClose={onClose}
      onSubmit={() => void submit()}
      submitting={pending}
      isDirty={() => isDirty}
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
        <FreeDeliveryDistrictsField control={form.control} branchProvinceCode={branchProvinceCode} />
        <TypographyTitle />
        <div className="grid gap-4 sm:grid-cols-2">
          {field('warehouseCode', 'Mã kho', { disabled: Boolean(branch), required: true })}
          {field('warehouseName', 'Tên kho', { required: true })}
        </div>
      </Form>
    </FormDrawer>
  );
}

/**
 * Multi-select quận/huyện đích được chi nhánh giao miễn phí (D62).
 *
 * Khác với `districtCode` ở trên — đó là quận/huyện của chính địa chỉ chi nhánh. Ở đây là danh sách
 * quận/huyện của KHÁCH. Danh mục quận/huyện lấy từ đúng endpoint GHN mà sổ địa chỉ khách đang dùng
 * (`useListShippingDistricts`) để không có hai cách chọn quận song song.
 */
function FreeDeliveryDistrictsField({
  control,
  branchProvinceCode,
}: {
  control: Control<OrganizationFormValues>;
  branchProvinceCode?: string;
}) {
  const { field, fieldState } = useController({ control, name: 'freeDeliveryDistrictCodes' });
  const [picked, setPicked] = useState<string | undefined>();
  const provinceCode = picked ?? (branchProvinceCode?.trim() || undefined);
  const provinces = useListShippingProvinces({ query: { ...CACHE_POLICY.REFERENCE } });
  const districts = useListShippingDistricts(
    { provinceCode: provinceCode ?? '' },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: Boolean(provinceCode) } },
  );
  const selected = field.value;
  const provinceOptions = useMemo(
    () => (provinces.data?.items ?? []).map((item) => ({ value: item.code, label: item.name })),
    [provinces.data],
  );
  const options = useMemo(
    () => (districts.data?.items ?? []).map((item) => ({ value: item.code, label: item.name })),
    [districts.data],
  );
  // Danh sách đã lưu có thể chứa quận thuộc tỉnh khác tỉnh đang lọc; giữ chúng làm option thô để
  // đổi bộ lọc tỉnh không âm thầm xoá lựa chọn cũ.
  const allOptions = useMemo(
    () => [
      ...options,
      ...(selected ?? [])
        .filter((code) => !options.some((option) => option.value === code))
        .map((code) => ({ value: code, label: code })),
    ],
    [options, selected],
  );

  return (
    <Form.Item
      label="Quận/huyện giao miễn phí"
      validateStatus={fieldState.error ? 'error' : undefined}
      help={
        fieldState.error?.message ??
        'Đơn giao tới các quận/huyện này được miễn phí vận chuyển, không gọi hãng. Đây là quận/huyện của khách nhận hàng, khác với quận/huyện địa chỉ chi nhánh ở trên. Tối đa 100 quận/huyện.'
      }
    >
      <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={provinces.isPending}
          placeholder="Lọc theo tỉnh/thành"
          value={provinceCode}
          options={provinceOptions}
          onChange={(code?: string) => setPicked(code)}
        />
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          disabled={!provinceCode && !selected?.length}
          loading={districts.isFetching}
          placeholder={provinceCode ? 'Chọn quận/huyện giao miễn phí' : 'Chọn tỉnh/thành trước'}
          value={selected ?? []}
          options={allOptions}
          onChange={(codes: string[]) => field.onChange(codes)}
          onBlur={field.onBlur}
        />
      </div>
    </Form.Item>
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
