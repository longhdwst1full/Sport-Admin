import { CloseCircleOutlined, CopyOutlined, PrinterOutlined } from '@ant-design/icons';
import { App, Button, Steps, Tooltip } from 'antd';
import { StatusTag } from '@/foundation/management';
import { printOrderReceipt } from '@/features/receipt';
import { ORDER_PROGRESS_STEP_LABELS, orderStatusPresentation } from '../constants/order.constants';
import { getOrderProgress, getProgressStepStatus } from '../model/order-actions.policy';
import type { OrderDetailView } from '../model/order.mapper';

/** Banner đầu drawer: mã đơn (sao chép), giờ đặt, trạng thái, nút in phiếu và tiến trình. */
export function OrderDetailHeader({ order }: { order: OrderDetailView }) {
  const { message } = App.useApp();
  const progress = getOrderProgress(order.status);

  const copyOrderNo = () => {
    // UX: clipboard có thể bị chặn (không phải HTTPS/không cấp quyền) — báo lỗi thay vì báo thành công giả.
    navigator.clipboard
      .writeText(order.orderNo)
      .then(() => void message.success(`Đã sao chép mã: ${order.orderNo}`))
      .catch(() => void message.error('Không sao chép được mã đơn'));
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 pt-7 pb-6 text-white">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/15 blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">Đơn hàng chi tiết</span>
            <Tooltip title="Sao chép mã đơn">
              <button
                type="button"
                aria-label="Sao chép mã đơn"
                onClick={copyOrderNo}
                className="text-white/60 hover:text-white cursor-pointer"
              >
                <CopyOutlined className="text-xs" />
              </button>
            </Tooltip>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 mb-0 font-mono">{order.orderNo}</h2>
          <div className="mt-1 text-xs text-slate-300">Thời gian đặt: {order.placedAtLabel}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusTag status={order.status} presentations={orderStatusPresentation} />
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={printOrderReceipt}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
          >
            In phiếu
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white/10 backdrop-blur-md p-4 border border-white/10">
        {progress.cancelled ? (
          <div className="flex items-center gap-2 text-rose-300 text-sm font-medium">
            <CloseCircleOutlined className="text-base" />
            <span>Đơn hàng đã huỷ</span>
          </div>
        ) : (
          <Steps
            size="small"
            current={progress.current}
            items={ORDER_PROGRESS_STEP_LABELS.map((label, index) => ({
              title: <span className="text-xs text-white/90">{label}</span>,
              status: getProgressStepStatus(index, progress),
            }))}
            className="order-steps-custom"
          />
        )}
      </div>
    </div>
  );
}
