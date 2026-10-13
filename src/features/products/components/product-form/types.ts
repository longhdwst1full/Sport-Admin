import type { ProductDetailDto } from '@/generated/api/catalog/catalog.schemas';

/** Hình dạng tối thiểu của một query tìm kiếm option mà các tab cần dùng. */
export interface SearchOptionsQuery {
  isFetching: boolean;
  data?: { items: Array<{ id: string; code: string; label: string }> };
}

/** Khối lưu ngay của chế độ Sửa: nhận sản phẩm đã nạp và báo workspace đọc lại sau mỗi lệnh ghi. */
export interface ProductPanelProps {
  product: ProductDetailDto;
  onChanged: () => Promise<void>;
}
