import { ProductType, type ProductStatus, type ProductSummaryDto } from '@/generated/api/catalog/catalog.schemas';
import { moneyFormatter } from '@/lib/format/money';

export interface ProductListRow {
  id: string;
  slug: string;
  name: string;
  productNo: string;
  secondaryLabel: string;
  imageUrl?: string;
  priceLabel: string;
  productType: string;
  /** Nhãn ngắn cho cột Loại; combo có màu riêng. */
  productTypeLabel: string;
  isBundle: boolean;
  status: ProductStatus;
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
    productTypeLabel: dto.productType === ProductType.BUNDLE ? 'Combo' : 'Thường',
    isBundle: dto.productType === ProductType.BUNDLE,
    status: dto.status,
    isPublished: dto.isPublished,
    version: dto.version,
  };
}
