import { useEffect, useState } from 'react';
import { BankOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Select } from 'antd';
import { useDebounce } from 'use-debounce';
import { useListAdminPayments } from '@/generated/api/payments/payments';
import type { ListAdminPaymentsMethod, ListAdminPaymentsStatus } from '@/generated/api/payments/models';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import { PaymentDetailDrawer } from '../components/payment-detail-drawer';
import { PaymentTable } from '../components/payment-table';
import { moneyFormatter, PAYMENT_PAGE_SIZE } from '../constants/payment.constants';

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListAdminPaymentsStatus>();
  const [method, setMethod] = useState<ListAdminPaymentsMethod>();
  const [selectedId, setSelectedId] = useState<string>();
  const [debouncedSearch] = useDebounce(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch, status, method]);
  const payments = useListAdminPayments({ page, limit: PAYMENT_PAGE_SIZE, search: debouncedSearch || undefined, status, method });
  const rows = payments.data?.items ?? [];

  return (
    <>
      <ManagementPage eyebrow="Finance operations" title="Thanh toán" description="Đối soát chuyển khoản và ghi nhận COD theo đúng phạm vi chi nhánh." dataNotice="Bằng chứng không tự xác nhận tiền; mọi thao tác dùng version, idempotency và lưu audit."
        metrics={[
          { key: 'total', label: 'Thanh toán phù hợp', value: payments.data?.total ?? 0, icon: <BankOutlined />, tone: 'blue' },
          { key: 'awaiting', label: 'Chờ đối soát trên trang', value: rows.filter((item) => item.status === 'AWAITING_CONFIRMATION').length, icon: <SafetyCertificateOutlined />, tone: 'orange' },
          { key: 'amount', label: 'Phải thu trên trang', value: moneyFormatter.format(rows.reduce((sum, item) => sum + Number(item.expectedAmount), 0)), icon: <BankOutlined />, tone: 'green' },
        ]}
        filters={<div className="flex w-full flex-wrap gap-3"><Input.Search allowClear className="min-w-64 flex-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã thanh toán, mã đơn, tên hoặc SĐT" /><Select allowClear className="min-w-44" value={status} onChange={setStatus} placeholder="Trạng thái" options={[{ value: 'PENDING', label: 'Chờ thanh toán' }, { value: 'AWAITING_CONFIRMATION', label: 'Chờ đối soát' }, { value: 'NEED_REVIEW', label: 'Cần kiểm tra' }, { value: 'SUCCESS', label: 'Đã thanh toán' }, { value: 'FAILED', label: 'Bị từ chối' }, { value: 'CANCELLED', label: 'Đã hủy' }]} /><Select allowClear className="min-w-40" value={method} onChange={setMethod} placeholder="Phương thức" options={[{ value: 'BANK_TRANSFER', label: 'Chuyển khoản' }, { value: 'COD', label: 'COD' }]} /><Button icon={<ReloadOutlined />} onClick={() => void payments.refetch()}>Làm mới</Button></div>}>
        {payments.isError && <Alert className="mb-5" type="error" showIcon message="Không tải được danh sách thanh toán" description={getApiErrorMessage(payments.error)} />}
        <PaymentTable rows={rows} loading={payments.isLoading || payments.isFetching} page={page} total={payments.data?.total ?? 0} onPageChange={setPage} onOpen={setSelectedId} />
      </ManagementPage>
      <PaymentDetailDrawer paymentId={selectedId} onClose={() => setSelectedId(undefined)} />
    </>
  );
}

