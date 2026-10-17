import { Form, InputNumber, type FormItemProps } from 'antd';

/** `Form.Item` nhận lỗi của react-hook-form; `help` riêng chỉ hiện khi ô không có lỗi. */
export function FieldItem({ error, help, ...props }: FormItemProps & { error?: { message?: string } }) {
  return <Form.Item {...props} validateStatus={error ? 'error' : undefined} help={error?.message ?? help} />;
}

/** Ô số nguyên của SKU (khối lượng, kích thước); xoá trắng thì về `undefined` thay vì `null`. */
export function VariantNumberInput({
  value,
  min,
  onBlur,
  onChange,
}: {
  value?: number;
  min: number;
  onBlur: () => void;
  onChange: (value?: number) => void;
}) {
  return (
    <InputNumber
      className="!w-full"
      min={min}
      precision={0}
      value={value}
      onBlur={onBlur}
      onChange={(next) => onChange(next ?? undefined)}
    />
  );
}
