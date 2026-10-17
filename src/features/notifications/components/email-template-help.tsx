import { QuestionCircleOutlined } from '@ant-design/icons';
import { Collapse } from 'antd';

/** Giải thích cách biến `{{...}}` và phần nội dung cố định hoạt động — hiển thị ở danh sách và drawer. */
export function EmailTemplateHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Collapse
      size="small"
      defaultActiveKey={defaultOpen ? ['help'] : []}
      items={[
        {
          key: 'help',
          label: (
            <span className="text-slate-600">
              <QuestionCircleOutlined className="mr-2" />
              Biến và phần sửa được hoạt động thế nào?
            </span>
          ),
          children: (
            <ul className="m-0 list-disc space-y-1.5 pl-5 text-[13px] leading-6 text-slate-600">
              <li>
                Chỉ sửa được <strong>tiêu đề</strong> và <strong>đoạn mở đầu</strong> (nằm ngay sau lời chào). Để trống =
                dùng nội dung mặc định của hệ thống.
              </li>
              <li>
                <code>{'{{orderNo}}'}</code> sẽ được thay bằng mã đơn thật khi gửi; tương tự với các biến khác trong
                “Chèn biến”. Số tiền tự định dạng (vd 1.250.000 ₫).
              </li>
              <li>Biến không thuộc mẫu này sẽ bị bỏ trống — màn xem trước sẽ cảnh báo.</li>
              <li>
                Bảng thông tin đơn, số tiền, nút bấm, link đặt lại mật khẩu và mã OTP do hệ thống tự dựng nên không sửa
                được — để số liệu gửi khách luôn đúng.
              </li>
              <li>
                Đoạn mở đầu nhận chữ đậm/nghiêng/gạch chân, danh sách và link http/https/mailto; định dạng khác bị bỏ khi
                lưu.
              </li>
              <li>Thay đổi có hiệu lực ngay cho email gửi sau khi lưu, kể cả email đang chờ gửi lại.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
