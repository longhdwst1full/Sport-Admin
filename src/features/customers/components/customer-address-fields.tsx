import { CACHE_POLICY } from '@/app/config/query-cache-policy';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select, Tag } from 'antd';
import type { FormInstance } from 'antd';
import {
  useListShippingDistricts,
  useListShippingProvinces,
  useListShippingWards,
} from '@/generated/api/shipping/shipping';
import type { CustomerFormValues } from '../model/customer-form.mapper';

const toOptions = (items: { code: string; name: string }[] | undefined) =>
  (items ?? []).map((item) => ({ value: item.code, label: item.name }));

/**
 * Một dòng địa chỉ trong sổ địa chỉ khách.
 *
 * Bảng `customer_addresses` lưu `province_code` là mã của hãng vận chuyển nhưng quận/phường lưu
 * tên chữ. Ô này giữ cả mã lẫn tên: mã để gọi hãng và để nạp danh sách cấp dưới, tên để gửi lên
 * đúng contract và để người đọc hiểu.
 */
export function CustomerAddressFields({
  form,
  name,
  index,
  onRemove,
  onMakeDefault,
}: {
  form: FormInstance<CustomerFormValues>;
  name: number;
  index: number;
  onRemove: () => void;
  onMakeDefault: () => void;
}) {
  const path = ['addresses', name] as const;
  const provinceCode = Form.useWatch([...path, 'provinceCode'], form) as string | undefined;
  const districtCode = Form.useWatch([...path, 'districtCode'], form) as string | undefined;
  const isDefault = Form.useWatch([...path, 'isDefault'], form) as boolean | undefined;

  const provinces = useListShippingProvinces({ query: { ...CACHE_POLICY.REFERENCE } });
  const districts = useListShippingDistricts(
    { provinceCode: provinceCode ?? '' },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: Boolean(provinceCode) } },
  );
  const wards = useListShippingWards(
    { districtCode: districtCode ?? '' },
    { query: { ...CACHE_POLICY.REFERENCE, enabled: Boolean(districtCode) } },
  );

  const patch = (values: Partial<CustomerFormValues['addresses'][number]>) => {
    const current = form.getFieldValue('addresses') as CustomerFormValues['addresses'];
    const next = [...current];
    next[name] = { ...next[name], ...values };
    form.setFieldsValue({ addresses: next });
  };

  return (
    <Card
      size="small"
      className="mb-3 !rounded-xl !border-slate-200 transition hover:!border-emerald-300"
      title={
        <span className="flex items-center gap-2">
          Địa chỉ {index + 1}
          {isDefault ? <Tag color="gold">Mặc định</Tag> : null}
        </span>
      }
      extra={
        <span className="flex gap-1">
          {!isDefault && (
            <Button size="small" type="link" onClick={onMakeDefault}>
              Đặt mặc định
            </Button>
          )}
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Xoá địa chỉ ${index + 1}`}
            onClick={onRemove}
          />
        </span>
      }
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Form.Item
          name={[name, 'recipient']}
          label="Người nhận"
          rules={[{ required: true, whitespace: true, message: 'Nhập tên người nhận' }]}
        >
          <Input maxLength={255} placeholder="Nguyễn Văn An" />
        </Form.Item>
        <Form.Item
          name={[name, 'phone']}
          label="Điện thoại người nhận"
          rules={[{ required: true, whitespace: true, message: 'Nhập số điện thoại người nhận' }]}
        >
          <Input maxLength={32} placeholder="0912345678" />
        </Form.Item>
        <Form.Item
          name={[name, 'provinceCode']}
          label="Tỉnh/Thành"
          rules={[{ required: true, message: 'Chọn tỉnh/thành' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={provinces.isPending}
            placeholder="Chọn tỉnh/thành"
            options={toOptions(provinces.data?.items)}
            // Đổi tỉnh thì quận/phường cũ không còn thuộc về nó nữa, phải xoá theo.
            onChange={(_code, option) =>
              patch({
                province: (option as { label?: string } | undefined)?.label ?? '',
                districtCode: '',
                district: '',
                wardCode: '',
                ward: '',
              })
            }
          />
        </Form.Item>
        <Form.Item name={[name, 'districtCode']} label="Quận/Huyện">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!provinceCode}
            loading={districts.isFetching}
            placeholder={provinceCode ? 'Chọn quận/huyện' : 'Chọn tỉnh/thành trước'}
            options={toOptions(districts.data?.items)}
            onChange={(code, option) =>
              patch({
                districtCode: code,
                district: (option as { label?: string } | undefined)?.label ?? '',
                wardCode: '',
                ward: '',
              })
            }
          />
        </Form.Item>
        <Form.Item name={[name, 'wardCode']} label="Phường/Xã">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!districtCode}
            loading={wards.isFetching}
            placeholder={districtCode ? 'Chọn phường/xã' : 'Chọn quận/huyện trước'}
            options={toOptions(wards.data?.items)}
            onChange={(code, option) =>
              patch({ wardCode: code, ward: (option as { label?: string } | undefined)?.label ?? '' })
            }
          />
        </Form.Item>
        <Form.Item
          className="sm:col-span-2"
          name={[name, 'addressLine']}
          label="Địa chỉ chi tiết"
          rules={[{ required: true, whitespace: true, message: 'Nhập số nhà, tên đường' }]}
        >
          <Input maxLength={500} placeholder="12 Nguyễn Trãi" />
        </Form.Item>
      </div>
    </Card>
  );
}
