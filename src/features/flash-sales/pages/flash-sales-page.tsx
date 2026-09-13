import { useEffect, useState } from 'react';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined, TrophyOutlined } from '@ant-design/icons';
import { Alert, App, Button, DatePicker, Form, Input, Modal, Select } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import type { Dayjs } from 'dayjs';
import {
  createAdminFlashSale,
  getListAdminFlashSalesQueryKey,
  useListAdminFlashSales,
} from '@/generated/api/promotions/promotions';
import type { ListAdminFlashSalesStatus } from '@/generated/api/promotions/models';
import { useCan } from '@/core/auth/permissions';
import { ManagementPage } from '@/foundation/management';
import { getApiErrorMessage } from '@/lib/api/error';
import { FlashSaleDetailDrawer } from '../components/flash-sale-detail-drawer';
import { FlashSaleTable } from '../components/flash-sale-table';
import { FLASH_SALE_PAGE_SIZE, flashSaleStatusPresentation } from '../constants/flash-sale.constants';

interface CreateFormValues {
  code: string;
  name: string;
  description?: string;
  window: [Dayjs, Dayjs];
}

const statusOptions = Object.entries(flashSaleStatusPresentation).map(([value, { label }]) => ({
  value,
  label,
}));

export function FlashSalesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const canManage = useCan('catalog.flash_sale.manage');
  const [form] = Form.useForm<CreateFormValues>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListAdminFlashSalesStatus>();
  const [selectedId, setSelectedId] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [debouncedSearch] = useDebounce(search.trim(), 350);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const campaigns = useListAdminFlashSales({
    page,
    limit: FLASH_SALE_PAGE_SIZE,
    search: debouncedSearch || undefined,
    status,
  });
  const rows = campaigns.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) =>
      createAdminFlashSale({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        startsAt: values.window[0].toISOString(),
        endsAt: values.window[1].toISOString(),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: getListAdminFlashSalesQueryKey() });
      setCreateOpen(false);
      form.resetFields();
      setSelectedId(created.id);
      void message.success('Đã tạo chiến dịch ở trạng thái nháp');
    },
    onError: (error: unknown) => void message.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <ManagementPage
        eyebrow="Marketing operations"
        title="Flash Sale"
        description="Chiến dịch giảm giá theo khung giờ với quota giới hạn cho từng SKU."
        dataNotice="Quota flash không thay thế tồn kho vật lý; checkout phải giành được cả hai trong cùng transaction."
        metrics={[
          {
            key: 'total',
            label: 'Chiến dịch phù hợp',
            value: campaigns.data?.total ?? 0,
            icon: <ThunderboltOutlined />,
            tone: 'blue',
          },
          {
            key: 'active',
            label: 'Đang chạy trên trang',
            value: rows.filter((row) => row.status === 'ACTIVE').length,
            icon: <TrophyOutlined />,
            tone: 'green',
          },
        ]}
        filters={
          <div className="flex w-full flex-wrap gap-3">
            <Input.Search
              allowClear
              className="min-w-64 flex-1"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã hoặc tên chiến dịch"
            />
            <Select
              allowClear
              className="min-w-44"
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
              options={statusOptions}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void campaigns.refetch()}>
              Làm mới
            </Button>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Tạo chiến dịch
              </Button>
            )}
          </div>
        }
      >
        {campaigns.isError && (
          <Alert
            className="mb-5"
            type="error"
            showIcon
            message="Không tải được danh sách chiến dịch"
            description={getApiErrorMessage(campaigns.error)}
          />
        )}
        <FlashSaleTable
          rows={rows}
          loading={campaigns.isLoading || campaigns.isFetching}
          page={page}
          total={campaigns.data?.total ?? 0}
          onPageChange={setPage}
          onOpen={setSelectedId}
        />
      </ManagementPage>

      <FlashSaleDetailDrawer campaignId={selectedId} onClose={() => setSelectedId(undefined)} />

      <Modal
        open={createOpen}
        title="Tạo chiến dịch flash sale"
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={createMutation.isPending}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item
            name="code"
            label="Mã chiến dịch"
            rules={[
              { required: true, message: 'Nhập mã chiến dịch' },
              { pattern: /^[A-Za-z0-9-]+$/, message: 'Chỉ dùng chữ, số và dấu gạch ngang' },
            ]}
          >
            <Input placeholder="FLASH-T9-2026" maxLength={32} />
          </Form.Item>
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên chiến dịch' }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="window"
            label="Khung giờ chạy"
            rules={[{ required: true, message: 'Chọn thời gian bắt đầu và kết thúc' }]}
          >
            <DatePicker.RangePicker showTime className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
