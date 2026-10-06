import type { Dayjs } from 'dayjs';
import type {
  CreateFlashSaleCampaignDto,
  UpsertFlashSaleItemDto,
} from '@/generated/api/promotions/promotions.schemas';

/** Suất bán đang soạn trong drawer tạo chiến dịch, chưa gửi lên API. */
export interface StagedItem {
  productVariantId: string;
  sku: string;
  name: string;
  basePrice?: number;
  salePrice: number;
  quota: number;
  perCustomerLimit?: number;
}

export interface CreateCampaignValues {
  code: string;
  name: string;
  description?: string;
  window: [Dayjs, Dayjs];
}

export function toCreateFlashSalePayload(campaign: CreateCampaignValues): CreateFlashSaleCampaignDto {
  return {
    code: campaign.code.trim().toUpperCase(),
    name: campaign.name.trim(),
    description: campaign.description?.trim() || undefined,
    startsAt: campaign.window[0].toISOString(),
    endsAt: campaign.window[1].toISOString(),
  };
}

export function toUpsertFlashSaleItemPayload(item: StagedItem): UpsertFlashSaleItemDto {
  return {
    productVariantId: item.productVariantId,
    salePrice: item.salePrice.toFixed(2),
    quota: item.quota,
    ...(item.perCustomerLimit ? { perCustomerLimit: item.perCustomerLimit } : {}),
  };
}
