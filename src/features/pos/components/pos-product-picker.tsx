import { SearchOutlined } from '@ant-design/icons';
import { Empty, Space, Tag, Tooltip } from 'antd';
import { searchPosCatalog } from '@/generated/api/orders/orders';
import type { PosCatalogItemDto } from '@/generated/api/orders/models';
import { AsyncPagedSelect } from '@/foundation/inputs/async-paged-select';
import { moneyFormatter, POS_SEARCH_LIMIT } from '../constants/pos.constants';

/** Lý do một mặt hàng không bán được; undefined nghĩa là chọn được. */
function blockedReasonOf(item: PosCatalogItemDto): string | undefined {
  if (item.unitPrice == null) return 'Chưa có giá hiệu lực';
  if (item.availableQuantity < 1) return 'Kho chi nhánh này đã hết hàng';
  return undefined;
}

/**
 * Chọn hàng bán tại quầy bằng một ô tìm kiếm duy nhất.
 *
 * Tìm và phân trang chạy trên Backend theo chi nhánh đang chọn (`searchPosCatalog`): tồn và giá là
 * của kho chi nhánh đó, còn danh mục có hàng trăm mặt hàng nên không tải hết một lượt. Cuộn tới đáy
 * mới gọi trang kế.
 *
 * Mặt hàng chưa có giá hoặc hết tồn vẫn hiện nhưng không chọn được — ẩn đi thì nhân viên tưởng hệ
 * thống không có hàng đó và đi tạo trùng.
 */
export function PosProductPicker({
  branchId,
  onPick,
  pickedIds,
}: {
  /** Chưa chọn chi nhánh thì chưa biết lấy tồn ở kho nào, nên chưa tìm hàng. */
  branchId?: string;
  onPick: (item: PosCatalogItemDto) => void;
  pickedIds: ReadonlySet<string>;
}) {
  if (!branchId) {
    return (
      <Empty
        className="!my-6"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chọn chi nhánh đang đứng quầy để xem hàng còn bán được."
      />
    );
  }

  return (
    <AsyncPagedSelect<PosCatalogItemDto>
      className="w-full"
      size="large"
      value={null}
      placeholder="Quét mã vạch, gõ SKU hoặc tên sản phẩm"
      suffixIcon={<SearchOutlined className="text-slate-400" />}
      queryKey={['pos-catalog', branchId]}
      pageSize={POS_SEARCH_LIMIT}
      fetchPage={async ({ search, page, limit }) => {
        const response = await searchPosCatalog({
          branchId,
          page,
          limit,
          ...(search ? { search } : {}),
        });
        return { items: response.items, hasMore: response.hasMore };
      }}
      toOption={(item) => ({
        value: item.id,
        label: `${item.sku} — ${item.name}`,
        disabled: Boolean(blockedReasonOf(item)),
      })}
      renderOption={(item) => {
        const price = item.unitPrice == null ? null : Number(item.unitPrice);
        return (
          <Tooltip title={blockedReasonOf(item)} placement="left">
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-800">{item.name}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-slate-500">{item.sku}</span>
                  {item.isBundle && <Tag color="purple">Combo {item.components.length} món</Tag>}
                  {pickedIds.has(item.id) && <Tag color="blue">Đã có trong đơn</Tag>}
                </div>
              </div>
              <Space size={6} className="shrink-0">
                {price == null ? (
                  <Tag color="red">Chưa có giá</Tag>
                ) : (
                  <span className="font-semibold text-emerald-700">
                    {moneyFormatter.format(price)}
                  </span>
                )}
                <Tag
                  color={
                    item.availableQuantity < 1
                      ? 'red'
                      : item.availableQuantity <= 5
                        ? 'orange'
                        : 'green'
                  }
                >
                  {item.availableQuantity < 1 ? 'Hết hàng' : `Còn ${item.availableQuantity}`}
                </Tag>
              </Space>
            </div>
          </Tooltip>
        );
      }}
      onSelectItem={(item) => onPick(item)}
    />
  );
}
