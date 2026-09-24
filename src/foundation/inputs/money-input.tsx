import { InputNumber, type InputNumberProps } from 'antd';
import { DECIMAL_SEPARATOR, groupDigits, stripSeparators } from './money-format';

/**
 * Ô nhập tiền VND: hiện dấu phân cách hàng nghìn khi gõ, nhưng giá trị gửi lên vẫn là số thuần.
 *
 * Giá tiền ở đây thường 6-8 chữ số. Không có dấu phân cách thì 1890000 và 18900000 nhìn gần như
 * nhau, và sai một chữ số là sai giá gấp mười lần.
 */
export type MoneyInputProps = Omit<InputNumberProps<number>, 'formatter' | 'parser'>;

export function MoneyInput({ min = 0, precision = 0, ...rest }: MoneyInputProps) {
  return (
    <InputNumber<number>
      {...rest}
      min={min}
      precision={precision}
      /**
       * BẮT BUỘC khai `decimalSeparator`. Quy ước Việt Nam dùng dấu chấm cho hàng nghìn, trùng với
       * `decimalSeparator` mặc định của antd; để mặc định thì antd đọc "1.500.000" như số thập
       * phân và giá trị sụp về 1.5 — ô nhập trông như không format được.
       */
      decimalSeparator={DECIMAL_SEPARATOR}
      formatter={groupDigits}
      // `as unknown as number` vì antd khai báo parser trả về kiểu giá trị, còn chuỗi rỗng là
      // trạng thái "chưa nhập" hợp lệ mà kiểu của antd không diễn tả được.
      parser={(display) => stripSeparators(display) as unknown as number}
    />
  );
}
