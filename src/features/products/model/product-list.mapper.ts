import type { ProductSummaryDto } from '@/generated/api/catalog/models';

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export interface ProductListRow {
  id: string;
  slug: string;
  name: string;
  productNo: string;
  secondaryLabel: string;
  imageUrl?: string;
  priceLabel: string;
  productType: string;
  status: string;
  isPublished: boolean;
  version: number;
}

/** CONTRACT: DTO cache không bị mutate; mọi field trình bày được chuẩn hóa một lần tại biên feature. */
export function toProductListRow(dto: ProductSummaryDto): ProductListRow {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    productNo: dto.productNo,
    secondaryLabel: `${dto.productNo} · ${dto.brand ?? '—'} · ${dto.primaryCategory ?? '—'}`,
    ...(dto.imageUrl ? { imageUrl: dto.imageUrl } : {}),
    priceLabel: dto.minPrice ? moneyFormatter.format(Number(dto.minPrice)) : '—',
    productType: dto.productType,
    status: dto.status,
    isPublished: dto.isPublished,
    version: dto.version,
  };
}
