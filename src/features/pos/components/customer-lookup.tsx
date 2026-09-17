import { useState } from 'react';
import { AutoComplete, Input, Tag } from 'antd';
import { useDebounce } from 'use-debounce';
import { useListAdminCustomers } from '@/generated/api/customers/customers';

export interface CustomerLookupValue {
  name: string;
  phone: string;
  email: string;
}

/**
 * Tra khách đã có trong hệ thống theo số điện thoại.
 *
 * Đơn tại quầy nhận khách bằng tên/điện thoại chứ không bằng ID, và Backend dùng số điện thoại để
 * nhận lại khách cũ. Nên ô này chỉ điền hộ thông tin; gõ tay một khách chưa từng mua vẫn hợp lệ.
 */
export function CustomerLookup({
  value,
  onChange,
  disabled = false,
}: {
  value: CustomerLookupValue;
  onChange: (patch: Partial<CustomerLookupValue>) => void;
  disabled?: boolean;
}) {
  const [keyword, setKeyword] = useState('');
  const [debounced] = useDebounce(keyword.trim(), 350);
  const query = useListAdminCustomers(
    { phone: debounced, limit: 8 },
    // Chỉ gọi khi người dùng đã gõ đủ để thu hẹp; tra theo một chữ số là quét cả bảng khách.
    { query: { enabled: debounced.length >= 3 } },
  );

  const options = (query.data?.items ?? []).map((customer) => ({
    value: customer.phone ?? '',
    label: (
      <div className="flex items-center justify-between gap-2">
        <span>
          <strong>{customer.name}</strong>
          <span className="ml-2 text-xs text-slate-500">{customer.phone}</span>
        </span>
        <Tag color="blue">Khách cũ</Tag>
      </div>
    ),
    customer,
  }));

  return (
    <AutoComplete
      className="w-full"
      disabled={disabled}
      options={options}
      value={value.phone}
      onSearch={(text) => {
        setKeyword(text);
        onChange({ phone: text });
      }}
      onChange={(text) => onChange({ phone: text })}
      onSelect={(_selected, option) => {
        const picked = (option as (typeof options)[number]).customer;
        onChange({
          phone: picked.phone ?? '',
          name: picked.name ?? value.name,
          email: picked.email ?? '',
        });
      }}
      notFoundContent={
        debounced.length >= 3 && !query.isPending ? 'Khách mới, nhập tên bên dưới' : null
      }
    >
      <Input placeholder="Số điện thoại khách" />
    </AutoComplete>
  );
}
