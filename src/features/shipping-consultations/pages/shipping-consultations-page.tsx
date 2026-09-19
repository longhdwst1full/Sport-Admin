import { useState } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  PhoneOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Alert, Button, Select } from 'antd';
import { useCan } from '@/core/auth/permissions';
import { useListAdminShippingConsultations } from '@/generated/api/checkout/checkout';
import {
  ListAdminShippingConsultationsStatus,
  type AdminShippingConsultationDto,
  type CheckoutQuoteDto,
} from '@/generated/api/checkout/models';
import { ManagementPage } from '@/foundation/management';
import { ShippingConsultationDrawer } from '../components/shipping-consultation-drawer';
import { ShippingConsultationTable } from '../components/shipping-consultation-table';
import {
  moneyFormatter,
  SHIPPING_CONSULTATION_PAGE_SIZE,
  shippingConsultationStatus,
} from '../constants/shipping-consultation.constants';

export function ShippingConsultationsPage() {
  const canManage = useCan('order.manage');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListAdminShippingConsultationsStatus>(
    ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION,
  );
  const [selected, setSelected] = useState<AdminShippingConsultationDto | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const consultations = useListAdminShippingConsultations({
    page,
    limit: SHIPPING_CONSULTATION_PAGE_SIZE,
    status,
  });
  const rows = consultations.data?.items ?? [];
  const currentPageSubtotal = rows.reduce((sum, item) => sum + Number(item.itemSubtotal), 0);

  const handleSaved = async (updated: CheckoutQuoteDto) => {
    setSuccessMessage(
      `Đã cập nhật ${updated.branchName}: ${moneyFormatter.format(Number(updated.shippingTotal ?? 0))}. Khách có thể kiểm tra lại và xác nhận giữ hàng.`,
    );
    setSelected(null);
    await consultations.refetch();
  };

  return (
    <>
      <ManagementPage
        eyebrow="Sales operations"
        title="Tư vấn giao hàng"
        description="Tiếp nhận checkout cồng kềnh hoặc giao xe khách, gọi khách và chốt phí trước khi khách xác nhận giữ hàng."
        metrics={[
          {
            key: 'total',
            label: status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION
              ? 'Đang chờ xử lý'
              : 'Đã chốt phí',
            value: consultations.data?.total ?? 0,
            icon: status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION
              ? <ClockCircleOutlined />
              : <CheckCircleOutlined />,
            tone: status === ListAdminShippingConsultationsStatus.AWAITING_SHIPPING_CONSULTATION
              ? 'orange'
              : 'green',
          },
          {
            key: 'page',
            label: 'Yêu cầu trên trang',
            value: rows.length,
            icon: <ShoppingCartOutlined />,
          },
          {
            key: 'lines',
            label: 'Dòng sản phẩm',
            value: rows.reduce((sum, item) => sum + item.items.length, 0),
            icon: <PhoneOutlined />,
            tone: 'blue',
          },
          {
            key: 'subtotal',
            label: 'Giá trị hàng trên trang',
            value: moneyFormatter.format(currentPageSubtotal),
            icon: <DollarOutlined />,
            hint: 'Giá đã gồm VAT',
          },
        ]}
        filters={(
          <Select
            className="min-w-56"
            value={status}
            options={Object.entries(shippingConsultationStatus).map(([value, presentation]) => ({
              value,
              label: presentation.label,
            }))}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
              setSuccessMessage('');
            }}
          />
        )}
      >
        {successMessage && (
          <Alert
            className="mb-5"
            type="success"
            showIcon
            closable
            message={successMessage}
            onClose={() => setSuccessMessage('')}
          />
        )}
        {consultations.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được yêu cầu tư vấn"
            description="Vui lòng kiểm tra phiên đăng nhập, quyền order.view và phạm vi chi nhánh."
            action={<Button onClick={() => consultations.refetch()}>Thử lại</Button>}
          />
        )}
        <ShippingConsultationTable
          rows={rows}
          loading={consultations.isLoading || consultations.isFetching}
          page={page}
          total={consultations.data?.total ?? 0}
          onPageChange={setPage}
          onOpen={setSelected}
        />
      </ManagementPage>

      <ShippingConsultationDrawer
        consultation={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onSaved={handleSaved}
      />
    </>
  );
}
