import { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Select, Space, Tag, Tooltip } from 'antd';
import { useDebounce } from 'use-debounce';
import { useSearchPosCatalog } from '@/generated/api/orders/orders';
import type { PosCatalogItemDto } from '@/generated/api/orders/models';
import { getApiErrorMessage } from '@/lib/api/error';
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
 * Tìm chạy trên Backend theo chi nhánh đang chọn (`searchPosCatalog`), không lọc trong danh sách đã
 * tải: tồn và giá là của kho chi nhánh đó, lọc phía trình duyệt sẽ hiện hàng của kho khác.
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
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 300);

  const catalog = useSearchPosCatalog(
    { search: debouncedSearch || undefined, page: 1, limit: POS_SEARCH_LIMIT, branchId },
    { query: { enabled: Boolean(branchId) } },
  );
  const rows = catalog.data?.items ?? [];

  const options = rows.map((item) => {
    const blocked = blockedReasonOf(item);
    const price = item.unitPrice == null ? null : Number(item.unitPrice);
    return {
      value: item.id,
      disabled: Boolean(blocked),
      // `label` là chuỗi để ô tìm kiếm và thẻ đã chọn hiển thị được; nội dung giàu nằm ở `option`.
      label: `${item.sku} — ${item.name}`,
      item,
      option: (
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
              <span className="font-semibold text-emerald-700">{moneyFormatter.format(price)}</span>
            )}
            <Tag color={item.availableQuantity < 1 ? 'red' : item.availableQuantity <= 5 ? 'orange' : 'green'}>
              {item.availableQuantity < 1 ? 'Hết hàng' : `Còn ${item.availableQuantity}`}
            </Tag>
          </Space>
        </div>
      ),
    };
  });

  return (
    <div className="space-y-3">
      <Tooltip title={branchId ? undefined : 'Chọn chi nhánh trước để biết lấy tồn ở kho nào'}>
        <Select
          className="w-full"
          size="large"
          showSearch
          disabled={!branchId}
          value={null}
          placeholder="Quét mã vạch, gõ SKU hoặc tên sản phẩm"
          suffixIcon={<SearchOutlined className="text-slate-400" />}
          // Lọc chạy trên Backend; để antd lọc lại sẽ giấu mất kết quả server vừa trả.
          filterOption={false}
          loading={catalog.isFetching}
          onSearch={setSearch}
          onChange={(id: string) => {
            const picked = options.find((option) => option.value === id)?.item;
            if (picked) onPick(picked);
            // Trả ô về rỗng để quét mã tiếp theo không phải xoá tay.
            setSearch('');
          }}
          optionRender={(option) =>
            options.find((candidate) => candidate.value === option.value)?.option
          }
          options={options}
          notFoundContent={
            !branchId
              ? 'Chọn chi nhánh trước'
              : catalog.isFetching
                ? 'Đang tìm...'
                : debouncedSearch
                  ? `Không có sản phẩm nào khớp "${debouncedSearch}"`
                  : 'Gõ SKU hoặc tên để tìm sản phẩm bán tại quầy'
          }
        />
      </Tooltip>

      {catalog.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tìm được sản phẩm"
          description={getApiErrorMessage(catalog.error, 'Kiểm tra lại kết nối rồi thử tìm lại.')}
          action={<Button onClick={() => void catalog.refetch()}>Thử lại</Button>}
        />
      )}
    </div>
  );
}
