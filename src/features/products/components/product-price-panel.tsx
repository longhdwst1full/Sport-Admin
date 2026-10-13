import { yupResolver } from '@hookform/resolvers/yup';
import { CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { useCan } from '@/core/auth/permissions';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { MoneyInput } from '@/foundation/inputs/money-input';
import { AdminTable, col } from '@/foundation/table';
import {
  getGetAdminProductPriceTimelineQueryKey,
  useCreateAdminProductPrice,
  useGetAdminProductPriceTimeline,
  useReplaceAdminProductPrice,
} from '@/generated/api/catalog/catalog';
import type { ProductPriceWindowDto } from '@/generated/api/catalog/catalog.schemas';
import { getApiErrorMessage } from '@/lib/api/error';
import { formatDateTime } from '@/lib/format/datetime';
import { formatMoney } from '@/lib/format/money';
import { ENTITY_ID_PATTERN } from '@/lib/validation/entity-id';
import { PRODUCT_PRICE_STATUS_PRESENTATION } from '../constants/product-status.constants';
import { INITIAL_PRICE_PATTERN } from '../model/product-initial-setup';
import { toVariantOptions } from '../model/product-lookup-options';
import { FieldItem } from './product-form/form-field-parts';
import type { ProductPanelProps } from './product-form/types';

interface PriceFormValues {
  variantId: string;
  amount: string;
  startsAt: string;
  reason?: string;
}

const schema: yup.ObjectSchema<PriceFormValues> = yup.object({
  variantId: yup.string().matches(ENTITY_ID_PATTERN, 'SKU không hợp lệ').required('Chọn SKU'),
  amount: yup.string().trim().matches(INITIAL_PRICE_PATTERN, 'Giá phải lớn hơn 0').required('Nhập giá bán'),
  startsAt: yup.string().required('Chọn thời điểm áp dụng'),
  reason: yup.string().trim().max(500, 'Tối đa 500 ký tự').optional(),
});

/** CONTRACT: API bắt buộc lý do khi giảm quá 20% so với giá tham chiếu (`CreatePriceDto.reason`). */
const LARGE_REDUCTION_RATIO = 0.2;

const inputNow = () => {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
};

const PRICE_COLUMNS: ColumnsType<ProductPriceWindowDto> = [
  { title: 'Giá đã VAT', dataIndex: 'amount', render: (value: string) => <strong>{formatMoney(value)}</strong> },
  col.dateTime<ProductPriceWindowDto>('startsAt', 'Bắt đầu', { width: undefined }),
  { title: 'Kết thúc', dataIndex: 'endsAt', render: (value?: string | null) => value ? formatDateTime(value) : 'Không giới hạn' },
  col.status<ProductPriceWindowDto, string>('status', 'Trạng thái', PRODUCT_PRICE_STATUS_PRESENTATION, { width: undefined }),
];

export function ProductPricePanel({ product, onChanged }: ProductPanelProps) {
  const { message, modal } = App.useApp();
  const canManage = useCan('catalog.price.manage');
  const queryClient = useQueryClient();
  const variantOptions = useMemo(() => toVariantOptions(product.variants), [product.variants]);
  const form = useForm<PriceFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { variantId: product.variants[0]?.id ?? '', amount: '', startsAt: inputNow(), reason: '' },
  });
  const variantId = form.watch('variantId');
  const timeline = useGetAdminProductPriceTimeline(variantId, {
    query: { enabled: Boolean(variantId), retry: false },
  });

  const afterSaved = async () => {
    await Promise.all([
      onChanged(),
      queryClient.invalidateQueries({ queryKey: getGetAdminProductPriceTimelineQueryKey(variantId) }),
    ]);
    form.reset({ variantId, amount: '', startsAt: inputNow(), reason: '' });
    void message.success('Đã lưu lịch giá. Giá hiển thị đã bao gồm VAT.');
  };
  // IDEMPOTENCY: cùng một x-request-id cho lần bấm lại sau khi mất response → API trả kết quả cũ thay vì
  // tạo bản giá thứ hai; sinh id mới sau khi lưu xong.
  const createPriceRequestId = useRef(crypto.randomUUID());
  const createPrice = useCreateAdminProductPrice({
    request: { headers: { 'x-request-id': createPriceRequestId.current } },
    mutation: {
      onSuccess: async () => {
        createPriceRequestId.current = crypto.randomUUID();
        await afterSaved();
      },
      onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể tạo giá.')),
    },
  });
  const replacePrice = useReplaceAdminProductPrice({
    mutation: { onSuccess: afterSaved, onError: (error) => void message.error(getApiErrorMessage(error, 'Không thể thay giá.')) },
  });

  const openWindow = timeline.data?.upcoming.at(-1)
    ?? (timeline.data?.current?.endsAt ? undefined : timeline.data?.current);

  const reductionRatio = (amount: string) => {
    const reference = openWindow ? Number(openWindow.amount) : undefined;
    return reference && reference > 0 && amount ? (reference - Number(amount)) / reference : 0;
  };
  const reasonRequired = reductionRatio(form.watch('amount')) > LARGE_REDUCTION_RATIO;

  const submit = form.handleSubmit((values) => {
    const reduction = reductionRatio(values.amount);
    const largeReduction = reduction > LARGE_REDUCTION_RATIO;
    if (largeReduction && !values.reason?.trim()) {
      form.setError('reason', { message: 'Bắt buộc nhập lý do khi giảm giá quá 20%' });
      return;
    }
    const startsAt = new Date(values.startsAt).toISOString();
    const run = () => openWindow
      ? replacePrice.mutateAsync({
          variantId: values.variantId,
          data: {
            amount: values.amount,
            startsAt,
            reason: values.reason?.trim() || undefined,
            expectedCurrentPriceId: openWindow.id,
            expectedCurrentPriceVersion: openWindow.version,
          },
        })
      : createPrice.mutateAsync({
          variantId: values.variantId,
          data: { amount: values.amount, startsAt, reason: values.reason?.trim() || undefined },
        });

    modal.confirm({
      title: largeReduction ? 'Xác nhận giảm giá trên 20%' : 'Xác nhận lịch giá',
      content: largeReduction
        ? `Giá giảm ${(reduction * 100).toFixed(1)}%. Lý do sẽ được lưu vào audit và không thể sửa lịch sử.`
        : 'Lịch giá cũ sẽ được giữ nguyên để truy vết; giá mới bắt đầu đúng thời điểm đã chọn.',
      okText: 'Xác nhận lưu',
      cancelText: 'Kiểm tra lại',
      okButtonProps: { danger: largeReduction },
      onOk: run,
    });
  });

  const errors = form.formState.errors;
  const timelineLoading = Boolean(variantId) && timeline.isLoading;

  return (
    <Card className="border-emerald-100 bg-emerald-50/30" title={<Space><DollarOutlined /> Quản lý lịch giá</Space>}>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {canManage ? (
          <Form layout="vertical" onFinish={() => void submit()}>
            <FieldItem label="SKU" required error={errors.variantId}>
              <Controller
                name="variantId"
                control={form.control}
                render={({ field }) => <Select {...field} placeholder="Chọn SKU cần đặt giá" options={variantOptions} />}
              />
            </FieldItem>
            <FieldItem label="Giá bán đã VAT (VND)" required error={errors.amount}>
              {/* Giá niêm yết 6-8 chữ số: không có dấu phân cách thì 1890000 và 18900000 nhìn gần
                  như nhau, và sai một chữ số là sai giá gấp mười lần. Form giữ giá dạng chuỗi thập
                  phân vì contract nhận `1990000.00`, nên chuyển qua lại ở đúng chỗ này. */}
              <Controller
                name="amount"
                control={form.control}
                render={({ field }) => (
                  <MoneyInput
                    className="!w-full"
                    prefix="₫"
                    placeholder="Nhập giá bán..."
                    value={field.value ? Number(field.value) : undefined}
                    onBlur={field.onBlur}
                    onChange={(value) => field.onChange(value == null ? '' : String(value))}
                  />
                )}
              />
            </FieldItem>
            <FieldItem label="Áp dụng từ" required error={errors.startsAt}>
              <Controller
                name="startsAt"
                control={form.control}
                render={({ field }) => <Input {...field} type="datetime-local" prefix={<CalendarOutlined />} />}
              />
            </FieldItem>
            <FieldItem
              label="Lý do / ghi chú"
              required={reasonRequired}
              error={errors.reason}
              help={`Bắt buộc nếu giá giảm trên ${LARGE_REDUCTION_RATIO * 100}%.`}
            >
              <Controller
                name="reason"
                control={form.control}
                render={({ field }) => (
                  <Input.TextArea {...field} rows={3} maxLength={500} showCount placeholder="Nhập lý do hoặc ghi chú..." />
                )}
              />
            </FieldItem>
            <Button type="primary" htmlType="submit" block loading={createPrice.isPending || replacePrice.isPending} disabled={!variantId}>
              {openWindow ? 'Lập giá thay thế' : 'Tạo giá đầu tiên'}
            </Button>
          </Form>
        ) : (
          <Alert showIcon type="info" message="Chỉ xem lịch giá" description="Tài khoản này không có quyền tạo hoặc thay giá." />
        )}

        <div className="min-w-0 space-y-4">
          {timeline.isError && (
            <QueryErrorAlert error={timeline.error} message="Không tải được lịch giá" retry={() => void timeline.refetch()} />
          )}
          <PriceWindowTable
            title="Giá hiện tại"
            loading={timelineLoading}
            rows={timeline.data?.current ? [timeline.data.current] : []}
            emptyText="Chưa có giá đang hiệu lực"
          />
          <PriceWindowTable
            title="Sắp áp dụng"
            loading={timelineLoading}
            rows={timeline.data?.upcoming ?? []}
            emptyText="Chưa có giá tương lai"
          />
          <PriceWindowTable
            title="Lịch sử bất biến"
            loading={timelineLoading}
            rows={timeline.data?.history ?? []}
            emptyText="Chưa có lịch sử giá"
            paginated
          />
        </div>
      </div>
    </Card>
  );
}

function PriceWindowTable({
  title,
  loading,
  rows,
  emptyText,
  paginated = false,
}: {
  title: string;
  loading: boolean;
  rows: ProductPriceWindowDto[];
  emptyText: string;
  paginated?: boolean;
}) {
  return (
    <div>
      <Typography.Title level={5}>{title}</Typography.Title>
      <AdminTable<ProductPriceWindowDto>
        size="small"
        rowKey="id"
        loading={loading}
        pagination={paginated ? { pageSize: 5, hideOnSinglePage: true } : false}
        dataSource={rows}
        columns={PRICE_COLUMNS}
        locale={{ emptyText }}
      />
    </div>
  );
}
