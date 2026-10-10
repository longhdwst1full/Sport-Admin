import { useEffect, useMemo } from 'react';
import {
  App,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
} from 'antd';
import { QueryErrorAlert } from '@/foundation/feedback/query-error-alert';
import { DetailSkeleton } from '@/foundation/feedback/page-skeleton';
import { useGetAdminBanner } from '@/generated/api/content/content';
import { BannerPlacement } from '@/generated/api/content/content.schemas';
import { ImageUploadField } from '@/features/media';
import { getApiErrorPayload, getApiFieldErrors } from '@/lib/api/error';
import {
  BANNER_LIMITS,
  BANNER_STALE_ERROR_CODES,
  BANNER_TARGET_URL_PATTERN,
  bannerPlacementOptions,
} from '../constants/banner.constants';
import { useBannerCategoryOptions } from '../hooks/use-banner-category-options';
import { useSaveBanner } from '../hooks/use-banner-commands';
import { bannerCommandErrorMessage } from '../model/banner-command-error';
import {
  EMPTY_BANNER_FORM,
  toBannerFormValues,
  type BannerFormValues,
  type BannerImageValue,
} from '../model/banner-form.mapper';
import { FormDrawer } from '@/foundation/overlay';

/**
 * Bọc `ImageUploadField` (trả URL + assetId) thành một giá trị form. CONTRACT: API cần `assetId` của
 * thư viện media; URL dán tay không có assetId nên bị form từ chối (xem rule của ô ảnh).
 */
function BannerImageInput({
  value,
  onChange,
  disabled,
}: {
  value?: BannerImageValue;
  onChange?: (value: BannerImageValue | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <ImageUploadField
      value={value?.url ?? ''}
      disabled={disabled}
      onChange={(url, assetId) => onChange?.(url ? { url, assetId } : undefined)}
    />
  );
}

/** CONTRACT: tên field trong `details` của lỗi 400 (DTO) → ô form tương ứng. */
const API_FIELD_TO_FORM: Record<string, keyof BannerFormValues> = {
  placement: 'placement',
  title: 'title',
  subtitle: 'subtitle',
  ctaText: 'ctaText',
  targetUrl: 'targetUrl',
  categoryId: 'categoryId',
  sortOrder: 'sortOrder',
  startsAt: 'schedule',
  endsAt: 'schedule',
  desktopAssetId: 'desktopImage',
  mobileAssetId: 'mobileImage',
};

const requireUploadedImage = (required: boolean) => ({
  validator: (_: unknown, value?: BannerImageValue) => {
    if (!value?.url) {
      return required ? Promise.reject(new Error('Tải ảnh desktop lên')) : Promise.resolve();
    }
    return value.assetId
      ? Promise.resolve()
      : Promise.reject(new Error('Dùng nút Upload để lấy ảnh từ thư viện media; không dán URL tay.'));
  },
});

/**
 * Tạo/sửa banner. Sửa thì tải bản chi tiết (`getAdminBanner`) để có version mới nhất. Drawer chỉ đóng
 * khi lưu thành công; lỗi giữ nguyên dữ liệu đã nhập, trừ lỗi "stale" — khi đó chi tiết được tải lại và
 * form đổ lại theo bản mới.
 */
export function BannerEditorDrawer({
  open,
  bannerId,
  onClose,
}: {
  open: boolean;
  /** Bỏ trống = tạo banner mới (DRAFT). */
  bannerId?: string;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<BannerFormValues>();
  const isEdit = Boolean(bannerId);
  const detail = useGetAdminBanner(bannerId ?? '', {
    query: { enabled: open && isEdit, retry: false },
  });
  const editing = isEdit ? detail.data : undefined;
  const save = useSaveBanner(editing);
  const placement = Form.useWatch('placement', form);
  const isCategoryTop = placement === BannerPlacement.CATEGORY_TOP;
  const categories = useBannerCategoryOptions(open && isCategoryTop);

  // Danh mục đang gắn có thể đã ngừng hoạt động (không nằm trong options): giữ nhãn từ banner.
  const categoryOptions = useMemo(() => {
    if (!editing?.categoryId || categories.options.some((o) => o.value === editing.categoryId)) {
      return categories.options;
    }
    const label = editing.categoryName ?? editing.categoryId;
    return [{ value: editing.categoryId, label, searchLabel: label }, ...categories.options];
  }, [categories.options, editing?.categoryId, editing?.categoryName]);

  // Đổ form khi mở hoặc khi chi tiết đổi (sau lỗi stale). TanStack Query giữ nguyên tham chiếu `editing` khi
  // refetch trả dữ liệu không đổi (structural sharing), nên không ghi đè dữ liệu đang gõ.
  useEffect(() => {
    if (!open) return;
    if (isEdit && !editing) return;
    form.resetFields();
    form.setFieldsValue(editing ? toBannerFormValues(editing) : EMPTY_BANNER_FORM);
  }, [open, isEdit, editing, form]);

  const submit = (values: BannerFormValues) => {
    save.mutate(values, {
      onSuccess: () => {
        void message.success(isEdit ? 'Đã cập nhật banner' : 'Đã tạo banner ở trạng thái nháp');
        onClose();
      },
      onError: (error) => {
        const fields = Object.entries(getApiFieldErrors(error)).flatMap(([name, err]) => {
          const field = API_FIELD_TO_FORM[name];
          return field ? [{ name: field, errors: [err] }] : [];
        });
        if (fields.length) form.setFields(fields);
        const code = getApiErrorPayload(error)?.code;
        if (code && BANNER_STALE_ERROR_CODES.has(code)) void message.warning(bannerCommandErrorMessage(error));
        else void message.error(bannerCommandErrorMessage(error));
      },
    });
  };

  return (
    <FormDrawer
      title={editing ? `Sửa banner ${editing.code}` : 'Tạo banner'}
      open={open}
      onClose={onClose}
      onSubmit={() => form.submit()}
      submitting={save.isPending}
      submitDisabled={isEdit && !editing}
      submitText={isEdit ? 'Lưu thay đổi' : 'Tạo banner'}
      isDirty={() => form.isFieldsTouched()}
    >
      {isEdit && detail.isError && (
        <QueryErrorAlert
          error={detail.error}
          message="Không tải được banner"
          description={bannerCommandErrorMessage(detail.error)}
          retry={() => void detail.refetch()}
        />
      )}
      {isEdit && !editing ? (
        detail.isError ? null : <DetailSkeleton />
      ) : (
        <>
          <Form form={form} layout="vertical" onFinish={submit} disabled={save.isPending} initialValues={EMPTY_BANNER_FORM}>
            <Form.Item name="placement" label="Vị trí hiển thị" rules={[{ required: true, message: 'Chọn vị trí' }]}>
              <Select options={bannerPlacementOptions} />
            </Form.Item>
            {isCategoryTop && (
              <Form.Item
                name="categoryId"
                label="Danh mục"
                extra={
                  categories.canView
                    ? 'Bỏ trống = hiển thị ở đầu mọi trang danh mục.'
                    : 'Bạn không có quyền xem danh mục; banner sẽ áp cho mọi danh mục.'
                }
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="searchLabel"
                  loading={categories.loading}
                  options={categoryOptions}
                  placeholder="Mọi danh mục"
                />
              </Form.Item>
            )}
            <Form.Item name="title" label="Tiêu đề" rules={[{ max: BANNER_LIMITS.TITLE_MAX }]}>
              <Input maxLength={BANNER_LIMITS.TITLE_MAX} />
            </Form.Item>
            <Form.Item name="subtitle" label="Phụ đề" rules={[{ max: BANNER_LIMITS.SUBTITLE_MAX }]}>
              <Input.TextArea rows={2} maxLength={BANNER_LIMITS.SUBTITLE_MAX} showCount />
            </Form.Item>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item name="ctaText" label="Chữ trên nút (CTA)" rules={[{ max: BANNER_LIMITS.CTA_MAX }]}>
                <Input maxLength={BANNER_LIMITS.CTA_MAX} placeholder="Mua ngay" />
              </Form.Item>
              <Form.Item
                name="targetUrl"
                label="Đường dẫn khi bấm"
                rules={[
                  { max: BANNER_LIMITS.TARGET_URL_MAX },
                  {
                    pattern: BANNER_TARGET_URL_PATTERN,
                    message: 'Đường dẫn bắt đầu bằng "/" (không phải "//") hoặc URL https://',
                  },
                ]}
              >
                <Input placeholder="/category/giay-chay-bo" />
              </Form.Item>
            </div>
            <div className="grid gap-x-4 sm:grid-cols-[1fr_160px]">
              <Form.Item
                name="schedule"
                label="Khung thời gian"
                extra="Bỏ trống bắt đầu = hiệu lực ngay khi xuất bản; bỏ trống kết thúc = không hết hạn."
                rules={[
                  {
                    validator: (_, value?: BannerFormValues['schedule']) => {
                      const [start, end] = value ?? [null, null];
                      return start && end && !end.isAfter(start)
                        ? Promise.reject(new Error('Kết thúc phải sau bắt đầu'))
                        : Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker.RangePicker
                  showTime
                  allowEmpty={[true, true]}
                  className="w-full"
                  placeholder={['Bắt đầu', 'Kết thúc']}
                />
              </Form.Item>
              <Form.Item name="sortOrder" label="Thứ tự" extra="Nhỏ hiển thị trước">
                <InputNumber min={0} max={BANNER_LIMITS.SORT_ORDER_MAX} precision={0} className="w-full" />
              </Form.Item>
            </div>
            <Form.Item
              name="desktopImage"
              label="Ảnh desktop"
              required
              rules={[requireUploadedImage(true)]}
            >
              <BannerImageInput />
            </Form.Item>
            <Form.Item
              name="mobileImage"
              label="Ảnh mobile"
              extra="Bỏ trống thì storefront dùng ảnh desktop."
              rules={[requireUploadedImage(false)]}
            >
              <BannerImageInput />
            </Form.Item>
          </Form>
        </>
      )}
    </FormDrawer>
  );
}
