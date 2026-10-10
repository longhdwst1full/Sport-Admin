import { useState } from 'react';
import { BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { useListAdminPayments } from '@/generated/api/payments/payments';
import { PaymentMethod, PaymentStatus } from '@/generated/api/payments/payments.schemas';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { SearchInput } from '@/foundation/inputs/search-input';
import { ManagementPage } from '@/foundation/management';
import { ADMIN_TABLE_DEFAULT_PAGE_SIZE, FilterBar, RefreshButton } from '@/foundation/table';
import { useUrlSearch } from '@/shared/hooks/use-url-search';
import { PaymentDetailDrawer } from '../components/payment-detail-drawer';
import { PaymentTable } from '../components/payment-table';
import { moneyFormatter, paymentMethodOptions, paymentStatusOptions } from '../constants/payment.constants';

/** Ô tìm, trạng thái, phương thức và trang nằm trên URL (`search`, `status`, `method`, `page`). */
export function PaymentsPage() {
  const search = useUrlSearch(['search']);
  const { url } = search;
  const status = url.getEnum('status', PaymentStatus);
  const method = url.getEnum('method', PaymentMethod);
  const page = url.getNumber('page', 1);
  const [selectedId, setSelectedId] = useState<string>();
  const payments = useListAdminPayments({
    page,
    limit: ADMIN_TABLE_DEFAULT_PAGE_SIZE,
    search: url.get('search'),
    status,
    method,
  });
  const rows = payments.data?.items ?? [];

  return (
    <>
      <ManagementPage eyebrow="Vận hành tài chính" title="Thanh toán" description="Đối soát chuyển khoản và ghi nhận COD theo đúng phạm vi chi nhánh."
        metrics={[
          { key: 'total', label: 'Thanh toán phù hợp', value: payments.data?.total ?? 0, icon: <BankOutlined />, tone: 'blue' },
          { key: 'awaiting', label: 'Chờ đối soát trên trang', value: rows.filter((item) => item.status === 'AWAITING_CONFIRMATION').length, icon: <SafetyCertificateOutlined />, tone: 'orange' },
          { key: 'amount', label: 'Phải thu trên trang', value: moneyFormatter.format(rows.reduce((sum, item) => sum + Number(item.expectedAmount), 0)), icon: <BankOutlined />, tone: 'green' },
        ]}
        filters={
          <FilterBar actions={<RefreshButton onRefresh={payments.refetch} loading={payments.isFetching} />}>
            <SearchInput value={search.values.search} onChange={search.setter('search')} placeholder="Mã thanh toán, mã đơn, tên hoặc SĐT" />
            <Select allowClear className="min-w-44" value={status} onChange={(value?: PaymentStatus) => url.patch({ status: value, page: undefined })} placeholder="Trạng thái" options={paymentStatusOptions} />
            <Select allowClear className="min-w-40" value={method} onChange={(value?: PaymentMethod) => url.patch({ method: value, page: undefined })} placeholder="Phương thức" options={paymentMethodOptions} />
          </FilterBar>
        }>
        {payments.isError && <QueryErrorAlert message="Không tải được danh sách thanh toán" error={payments.error} retry={() => void payments.refetch()} />}
        <PaymentTable rows={rows} loading={payments.isLoading || payments.isFetching} page={page} total={payments.data?.total ?? 0} onPageChange={(next) => url.set('page', next > 1 ? next : undefined)} onOpen={setSelectedId} />
      </ManagementPage>
      <PaymentDetailDrawer paymentId={selectedId} onClose={() => setSelectedId(undefined)} />
    </>
  );
}
