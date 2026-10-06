import { useState } from 'react';
import { useListPageReset } from '@/shared/hooks/use-list-page-reset';
import { useSearchState } from '@/shared/hooks/use-search-state';
import { BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Select } from 'antd';
import { useListAdminPayments } from '@/generated/api/payments/payments';
import type { PaymentMethod, PaymentStatus } from '@/generated/api/payments/payments.schemas';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { FilterBar, RefreshButton } from '@/foundation/table';
import { getApiErrorMessage } from '@/lib/api/error';
import { PaymentDetailDrawer } from '../components/payment-detail-drawer';
import { PaymentTable } from '../components/payment-table';
import {
  moneyFormatter,
  PAYMENT_PAGE_SIZE,
  paymentMethodOptions,
  paymentStatusOptions,
} from '../constants/payment.constants';

export function PaymentsPage() {
  const search = useSearchState();
  const debouncedSearch = search.debounced;
  const [status, setStatus] = useState<PaymentStatus>();
  const [method, setMethod] = useState<PaymentMethod>();
  const [selectedId, setSelectedId] = useState<string>();
  const [page, setPage] = useListPageReset([debouncedSearch, status, method]);
  const payments = useListAdminPayments({ page, limit: PAYMENT_PAGE_SIZE, search: debouncedSearch, status, method });
  const rows = payments.data?.items ?? [];

  return (
    <>
      <ManagementPage eyebrow="Finance operations" title="Thanh toán" description="Đối soát chuyển khoản và ghi nhận COD theo đúng phạm vi chi nhánh."
        metrics={[
          { key: 'total', label: 'Thanh toán phù hợp', value: payments.data?.total ?? 0, icon: <BankOutlined />, tone: 'blue' },
          { key: 'awaiting', label: 'Chờ đối soát trên trang', value: rows.filter((item) => item.status === 'AWAITING_CONFIRMATION').length, icon: <SafetyCertificateOutlined />, tone: 'orange' },
          { key: 'amount', label: 'Phải thu trên trang', value: moneyFormatter.format(rows.reduce((sum, item) => sum + Number(item.expectedAmount), 0)), icon: <BankOutlined />, tone: 'green' },
        ]}
        filters={
          <FilterBar actions={<RefreshButton onRefresh={payments.refetch} loading={payments.isFetching} />}>
            <SearchInput value={search.value} onChange={search.setValue} placeholder="Mã thanh toán, mã đơn, tên hoặc SĐT" />
            <Select allowClear className="min-w-44" value={status} onChange={setStatus} placeholder="Trạng thái" options={paymentStatusOptions} />
            <Select allowClear className="min-w-40" value={method} onChange={setMethod} placeholder="Phương thức" options={paymentMethodOptions} />
          </FilterBar>
        }>
        {payments.isError && <Alert className="mb-5" type="error" showIcon message="Không tải được danh sách thanh toán" description={getApiErrorMessage(payments.error)} />}
        <PaymentTable rows={rows} loading={payments.isLoading || payments.isFetching} page={page} total={payments.data?.total ?? 0} onPageChange={setPage} onOpen={setSelectedId} />
      </ManagementPage>
      <PaymentDetailDrawer paymentId={selectedId} onClose={() => setSelectedId(undefined)} />
    </>
  );
}
