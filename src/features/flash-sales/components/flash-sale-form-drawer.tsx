import { useState } from 'react';
import { Alert, App, DatePicker, Form, Input } from 'antd';
import { FormDrawer } from '@/foundation/overlay';
import type { FlashSaleCampaignDetailDto } from '@/generated/api/promotions/promotions.schemas';
import {
  isItemChanged,
  toCampaignForm,
  toEditableItem,
  validateItem,
  type CampaignFormValues,
  type EditableItem,
} from '../model/flash-sale.mapper';
import { FlashSaleItemsEditor } from './flash-sale-items-editor';

export interface FlashSaleSubmit {
  campaign: CampaignFormValues;
  /** Đã bỏ trường thông tin chiến dịch không đổi (sửa) thì không gọi API sửa chiến dịch. */
  campaignChanged: boolean;
  /** Chỉ dòng mới hoặc dòng đã đổi. */
  items: EditableItem[];
}

/**
 * Một drawer cho cả tạo và sửa chiến dịch: thông tin chiến dịch + bảng suất bán, một nút lưu tất cả.
 * Sửa: mã chiến dịch khoá (bất biến), chỉ gửi dòng đã đổi. Nơi gọi mount lại theo `campaign.version`
 * để mở lại là thấy dữ liệu mới nhất.
 */
export function FlashSaleFormDrawer({
  open,
  campaign,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  /** Có = sửa chiến dịch này; không có = tạo mới. */
  campaign?: FlashSaleCampaignDetailDto;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (value: FlashSaleSubmit) => void;
}) {
  const { message } = App.useApp();
  const editing = Boolean(campaign);
  const [form] = Form.useForm<CampaignFormValues>();
  const [items, setItems] = useState<EditableItem[]>(() => (campaign?.items ?? []).map(toEditableItem));
  const [showErrors, setShowErrors] = useState(false);
  const changedItems = items.filter(isItemChanged);

  async function submit() {
    setShowErrors(true);
    const values = await form.validateFields().catch(() => undefined);
    const invalid = changedItems.filter((item) => Object.keys(validateItem(item)).length > 0);
    if (!values) return;
    if (invalid.length > 0) {
      void message.error(`Còn ${invalid.length} suất bán thiếu giá hoặc số suất: ${invalid.map((i) => i.sku).join(', ')}`);
      return;
    }
    onSubmit({ campaign: values, campaignChanged: !editing || form.isFieldsTouched(), items: changedItems });
  }

  const submitText = editing
    ? `Lưu tất cả${changedItems.length > 0 ? ` (${changedItems.length} suất)` : ''}`
    : `Tạo chiến dịch${changedItems.length > 0 ? ` + ${changedItems.length} suất` : ''}`;

  return (
    <FormDrawer
      open={open}
      size="lg"
      title={editing ? `Sửa chiến dịch ${campaign?.code}` : 'Tạo chiến dịch flash sale'}
      onClose={onCancel}
      onSubmit={() => void submit()}
      submitting={submitting}
      submitText={submitText}
      isDirty={() => form.isFieldsTouched() || changedItems.length > 0}
    >
      <Alert
        className="mb-4"
        type={editing ? 'warning' : 'info'}
        showIcon
        message={editing ? 'Thay đổi áp dụng ngay khi lưu' : 'Chiến dịch tạo ra ở trạng thái nháp'}
        description={
          editing
            ? 'Rút ngắn khung giờ hoặc đổi giá của chiến dịch đang chạy sẽ thay đổi giá đang hiển thị trên trang bán.'
            : 'Chưa có gì hiển thị trên trang bán cho tới khi bạn kích hoạt chiến dịch.'
        }
      />

      <Form form={form} layout="vertical" initialValues={campaign ? toCampaignForm(campaign) : undefined}>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="code"
            label="Mã chiến dịch"
            rules={[
              { required: true, message: 'Nhập mã chiến dịch' },
              { pattern: /^[A-Za-z0-9-]+$/, message: 'Chỉ dùng chữ, số và dấu gạch ngang' },
            ]}
          >
            <Input placeholder="FLASH-T9-2026" maxLength={32} disabled={editing} />
          </Form.Item>
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên chiến dịch' }]}>
            <Input maxLength={255} />
          </Form.Item>
        </div>
        <Form.Item
          name="window"
          label="Khung giờ chạy"
          rules={[{ required: true, message: 'Chọn thời gian bắt đầu và kết thúc' }]}
        >
          <DatePicker.RangePicker showTime format="HH:mm DD/MM/YYYY" className="w-full" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>

      <div className="mb-2 text-sm font-semibold text-slate-800">Suất bán ({items.length})</div>
      <FlashSaleItemsEditor
        items={items}
        onChange={setItems}
        enabled={open}
        showErrors={showErrors}
      />
    </FormDrawer>
  );
}
