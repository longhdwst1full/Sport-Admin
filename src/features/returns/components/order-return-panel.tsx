import { useState } from 'react';
import { RollbackOutlined } from '@ant-design/icons';
import { App, Button, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCan } from '@/core/auth/permissions';
import { useGetAdminReturnEligibility } from '@/generated/api/returns/returns';
import { RETURN_PERMISSION, returnEligibilityReasonLabels } from '../constants/return.constants';
import { CreateReturnModal } from './create-return-modal';

/**
 * Khối "Đổi trả" trong chi tiết đơn: cho nhân viên tạo phiếu hộ khách gọi hotline (D55).
 *
 * UX: đơn chưa giao thì ẩn hẳn khối để chi tiết đơn không thêm một ô vô nghĩa; các lý do khác
 * (quá hạn, đã có phiếu mở, hết món) vẫn hiện để nhân viên trả lời khách.
 */
export function OrderReturnPanel({ orderId }: { orderId: string }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const canCreate = useCan(RETURN_PERMISSION.CREATE);
  const [open, setOpen] = useState(false);
  const eligibility = useGetAdminReturnEligibility(orderId, { query: { enabled: canCreate && Boolean(orderId), retry: false } });
  const data = eligibility.data;

  if (!canCreate || !data || data.reason === 'ORDER_NOT_RETURNABLE') return null;

  return (
    <Card size="small" className="rounded-2xl" title="Đổi trả">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {data.returnDeadline && (
            <div>Hạn đổi trả: <strong>{new Date(data.returnDeadline).toLocaleDateString('vi-VN')}</strong></div>
          )}
          {data.reason && (
            <Typography.Text type="secondary">
              {returnEligibilityReasonLabels[data.reason]}
              {data.openReturnNo ? ` (${data.openReturnNo})` : ''}
            </Typography.Text>
          )}
        </div>
        <Button icon={<RollbackOutlined />} disabled={!data.eligible} onClick={() => setOpen(true)}>
          Tạo phiếu trả hộ khách
        </Button>
      </div>
      {data.eligible && (
        <CreateReturnModal
          eligibility={data}
          open={open}
          onClose={() => setOpen(false)}
          onCreated={(created) => {
            setOpen(false);
            void message.success(`Đã tạo phiếu ${created.returnNo}`);
            void navigate(`/returns?id=${created.id}`);
          }}
        />
      )}
    </Card>
  );
}
