import dayjs, { type Dayjs } from 'dayjs';
import type { ActiveLookupOptionDto } from '@/generated/api/catalog/catalog.schemas';
import type {
  CreateFlashSaleCampaignDto,
  FlashSaleCampaignDetailDto,
  FlashSaleItemDto,
  UpdateFlashSaleCampaignDto,
  UpsertFlashSaleItemDto,
} from '@/generated/api/promotions/promotions.schemas';

/**
 * Một dòng suất bán trong bảng soạn (tạo mới hoặc sửa chiến dịch). Dòng mới chưa có `itemId`;
 * dòng có sẵn giữ `original` để chỉ gửi lại những dòng thật sự đổi.
 */
export interface EditableItem {
  productVariantId: string;
  itemId?: string;
  sku: string;
  name: string;
  /** Giá thường hiện hành; không có thì không tính được giá theo %. */
  basePrice?: number;
  salePrice: number | null;
  quota: number | null;
  /** Đã bán + đang giữ: quota mới không được thấp hơn (API chặn oversell ngược). */
  committed: number;
  /** Suất đã gỡ; lưu lại dòng này là mở bán lại. */
  inactive: boolean;
  original?: Pick<EditableItem, 'salePrice' | 'quota'>;
}

export interface CampaignFormValues {
  code: string;
  name: string;
  description?: string;
  window: [Dayjs, Dayjs];
}

const toNumber = (value?: string | null) => {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export function toEditableItem(dto: FlashSaleItemDto): EditableItem {
  const values = {
    salePrice: toNumber(dto.salePrice) ?? null,
    quota: dto.quota,
  };
  return {
    productVariantId: dto.productVariantId,
    itemId: dto.id,
    sku: dto.sku,
    name: dto.productName,
    basePrice: toNumber(dto.regularPrice),
    ...values,
    committed: Math.max(dto.quota - dto.availableQuantity, 0),
    inactive: dto.status !== 'ACTIVE',
    original: values,
  };
}

export function newEditableItem(option: ActiveLookupOptionDto, salePrice?: number): EditableItem {
  const basePrice = toNumber(option.priceAmount);
  return {
    productVariantId: option.id,
    sku: option.code,
    name: option.label,
    basePrice,
    salePrice: salePrice ?? basePrice ?? null,
    quota: null,
    committed: 0,
    inactive: false,
  };
}

/** Dòng mới hoặc dòng có sẵn đã đổi giá/suất/giới hạn — chỉ những dòng này được gửi đi. */
export function isItemChanged(item: EditableItem): boolean {
  const { original } = item;
  return (
    !original ||
    original.salePrice !== item.salePrice ||
    original.quota !== item.quota
  );
}

export type ItemErrors = Partial<Record<'salePrice' | 'quota', string>>;

export function validateItem(item: EditableItem): ItemErrors {
  const errors: ItemErrors = {};
  if (!item.salePrice || item.salePrice < 1) errors.salePrice = 'Nhập giá flash';
  if (!item.quota || item.quota < 1) errors.quota = 'Nhập số suất';
  else if (item.quota < item.committed) errors.quota = `Tối thiểu ${item.committed} (đã bán/đang giữ)`;
  return errors;
}

export function toCampaignForm(campaign: FlashSaleCampaignDetailDto): CampaignFormValues {
  return {
    code: campaign.code,
    name: campaign.name,
    description: campaign.description ?? undefined,
    window: [dayjs(campaign.startsAt), dayjs(campaign.endsAt)],
  };
}

export function toCreateFlashSalePayload(campaign: CampaignFormValues): CreateFlashSaleCampaignDto {
  return {
    code: campaign.code.trim().toUpperCase(),
    name: campaign.name.trim(),
    description: campaign.description?.trim() || undefined,
    startsAt: campaign.window[0].toISOString(),
    endsAt: campaign.window[1].toISOString(),
  };
}

/** Mã chiến dịch bất biến sau khi tạo nên không nằm trong payload sửa. */
export function toUpdateFlashSalePayload(
  campaign: CampaignFormValues,
  expectedVersion: string,
): UpdateFlashSaleCampaignDto {
  const { name, description, startsAt, endsAt } = toCreateFlashSalePayload(campaign);
  return { expectedVersion, name, description, startsAt, endsAt };
}

/** Dòng đã qua `validateItem` nên giá và suất chắc chắn có. Decimal gửi dạng chuỗi để không mất chính xác. */
export function toUpsertFlashSaleItemPayload(item: EditableItem): UpsertFlashSaleItemDto {
  return {
    productVariantId: item.productVariantId,
    salePrice: (item.salePrice ?? 0).toFixed(2),
    quota: item.quota ?? 0,
  };
}
