import { SearchOutlined } from '@ant-design/icons';
import { Input, type InputProps } from 'antd';
import type { ReactNode } from 'react';

export interface SearchInputProps extends Omit<InputProps, 'onChange' | 'prefix' | 'width'> {
  value: string;
  onChange: (value: string) => void;
  /** Icon đầu ô; mặc định kính lúp. */
  icon?: ReactNode;
  /**
   * `main`: ô tìm chính của màn (320px). `field`: ô lọc theo một trường trong hàng có nhiều ô (tên, SĐT,
   * email, mã yêu cầu…; 224px). Chỉ hai cỡ để mọi màn trông đồng bộ — `className` chỉ dùng khi ô nằm
   * trong lưới/bố cục riêng (vd. toolbar sản phẩm chia cột).
   */
  width?: 'main' | 'field';
}

const SEARCH_INPUT_WIDTH = {
  main: 'w-full sm:!w-80',
  field: 'w-full sm:!w-56',
} as const;

/** Ô tìm kiếm của thanh lọc: có nút xoá, icon xám và độ rộng chuẩn theo `width`; debounce do chỗ gọi quyết định. */
export function SearchInput({ value, onChange, icon, width = 'main', className, ...props }: SearchInputProps) {
  return (
    <Input
      allowClear
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      prefix={icon ?? <SearchOutlined className="text-slate-400" />}
      className={className ?? SEARCH_INPUT_WIDTH[width]}
    />
  );
}
