import { Button, Space } from 'antd';
import type { OrderAction } from '../model/order-actions.policy';

interface OrderActionFooterProps {
  availability: Record<OrderAction, boolean>;
  onAction: (action: OrderAction) => void;
  onClose: () => void;
}

/** PERMISSION: nơi gọi chỉ render khi có `order.manage`; nút tắt theo policy, API vẫn kiểm tra lại. */
export function OrderActionFooter({ availability, onAction, onClose }: OrderActionFooterProps) {
  return (
    <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-2 z-10 shadow-lg">
      <Space wrap>
        <Button danger disabled={!availability.cancel} onClick={() => onAction('cancel')} className="font-medium">
          Huỷ đơn
        </Button>
        {/* UX: lối ra hiếm của nhánh giao thất bại, chỉ hiện khi hàng hoàn đã về kho thay vì nút tắt thường trực. */}
        {availability.cancelAfterFailedDelivery && (
          <Button danger onClick={() => onAction('cancelAfterFailedDelivery')} className="font-medium">
            Huỷ sau giao thất bại
          </Button>
        )}
      </Space>
      <Space wrap>
        <Button onClick={onClose}>Đóng</Button>
        <Button disabled={!availability.confirm} onClick={() => onAction('confirm')} className="font-medium">
          Xác nhận đơn
        </Button>
        <Button
          type="primary"
          disabled={!availability.complete}
          onClick={() => onAction('complete')}
          className="font-medium bg-emerald-600 hover:bg-emerald-500"
        >
          Hoàn tất đơn
        </Button>
      </Space>
    </div>
  );
}
