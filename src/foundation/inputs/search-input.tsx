import { SearchOutlined } from '@ant-design/icons';
import { Input, type InputProps } from 'antd';
import type { ReactNode } from 'react';

export interface SearchInputProps extends Omit<InputProps, 'onChange' | 'prefix'> {
  value: string;
  onChange: (value: string) => void;
  /** Icon đầu ô; mặc định kính lúp. */
  icon?: ReactNode;
}

/** Ô tìm kiếm của thanh lọc: có nút xoá, icon xám và độ rộng chuẩn; debounce do chỗ gọi quyết định. */
export function SearchInput({ value, onChange, icon, className, ...props }: SearchInputProps) {
  return (
    <Input
      allowClear
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      prefix={icon ?? <SearchOutlined className="text-slate-400" />}
      className={className ?? 'w-full sm:!w-[240px]'}
    />
  );
}
