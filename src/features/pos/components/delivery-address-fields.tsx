import { Form, Input, Select } from 'antd';
import {
  useListShippingDistricts,
  useListShippingProvinces,
  useListShippingWards,
} from '@/generated/api/shipping/shipping';
import type { PosDeliveryValues } from '../model/pos-checkout';

/**
 * Địa chỉ giao lấy mã địa giới từ hãng vận chuyển.
 *
 * Tạo vận đơn cần mã quận/phường của hãng chứ không nhận địa chỉ chữ, nên ô này lưu cả mã lẫn tên:
 * mã để gọi hãng, tên để in trên đơn và cho người đọc.
 */
export function DeliveryAddressFields({
  value,
  onChange,
}: {
  value: PosDeliveryValues;
  onChange: (patch: Partial<PosDeliveryValues>) => void;
}) {
  const provinces = useListShippingProvinces();
  const districts = useListShippingDistricts(
    { provinceCode: value.provinceCode },
    { query: { enabled: Boolean(value.provinceCode) } },
  );
  const wards = useListShippingWards(
    { districtCode: value.districtCode },
    { query: { enabled: Boolean(value.districtCode) } },
  );

  const toOptions = (items: { code: string; name: string }[] | undefined) =>
    (items ?? []).map((item) => ({ value: item.code, label: item.name }));

  return (
    <>
      <Form.Item label="Người nhận" required>
        <Input
          value={value.recipient}
          placeholder="Tên người nhận hàng"
          onChange={(event) => onChange({ recipient: event.target.value })}
        />
      </Form.Item>

      <Form.Item label="Điện thoại người nhận" required>
        <Input
          value={value.phone}
          placeholder="09xxxxxxxx"
          onChange={(event) => onChange({ phone: event.target.value })}
        />
      </Form.Item>

      <Form.Item label="Tỉnh/Thành" required>
        <Select
          showSearch
          optionFilterProp="label"
          loading={provinces.isPending}
          value={value.provinceCode || undefined}
          placeholder="Chọn tỉnh/thành"
          options={toOptions(provinces.data?.items)}
          onChange={(code, option) =>
            // Đổi tỉnh thì quận/phường cũ không còn thuộc về nó nữa, phải xoá theo.
            onChange({
              provinceCode: code,
              province: (option as { label: string }).label,
              districtCode: '',
              district: '',
              wardCode: '',
              ward: '',
            })
          }
        />
      </Form.Item>

      <Form.Item label="Quận/Huyện" required>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={!value.provinceCode}
          loading={districts.isFetching}
          value={value.districtCode || undefined}
          placeholder="Chọn quận/huyện"
          options={toOptions(districts.data?.items)}
          onChange={(code, option) =>
            onChange({
              districtCode: code,
              district: (option as { label: string }).label,
              wardCode: '',
              ward: '',
            })
          }
        />
      </Form.Item>

      <Form.Item label="Phường/Xã" required>
        <Select
          showSearch
          optionFilterProp="label"
          disabled={!value.districtCode}
          loading={wards.isFetching}
          value={value.wardCode || undefined}
          placeholder="Chọn phường/xã"
          options={toOptions(wards.data?.items)}
          onChange={(code, option) =>
            onChange({ wardCode: code, ward: (option as { label: string }).label })
          }
        />
      </Form.Item>

      <Form.Item label="Địa chỉ chi tiết" required>
        <Input
          value={value.addressLine}
          placeholder="Số nhà, tên đường"
          onChange={(event) => onChange({ addressLine: event.target.value })}
        />
      </Form.Item>
    </>
  );
}
