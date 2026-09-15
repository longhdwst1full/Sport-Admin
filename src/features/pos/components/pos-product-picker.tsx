import { useState } from 'react';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Input, List, Skeleton, Tag, Tooltip } from 'antd';
import { useDebounce } from 'use-debounce';
import { useSearchPosCatalog } from '@/generated/api/orders/orders';
import type { PosCatalogItemDto } from '@/generated/api/orders/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { moneyFormatter, POS_SEARCH_LIMIT } from '../constants/pos.constants';

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

  if (!branchId) {
    return (
      <Empty
        className="my-12"
        description="Chọn chi nhánh đang đứng quầy ở cột bên phải để xem hàng còn bán được."
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Input
        allowClear
        size="large"
        autoFocus
        value={search}
        prefix={<SearchOutlined className="text-slate-400" />}
        placeholder="Quét mã vạch, gõ SKU hoặc tên sản phẩm"
        onChange={(event) => setSearch(event.target.value)}
      />

      {catalog.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tìm được sản phẩm"
          description={getApiErrorMessage(catalog.error, 'Kiểm tra lại kết nối rồi thử tìm lại.')}
          action={<Button onClick={() => void catalog.refetch()}>Thử lại</Button>}
        />
      )}

      {catalog.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : rows.length === 0 ? (
        <Empty
          className="my-10"
          description={
            debouncedSearch
              ? `Không có sản phẩm nào khớp "${debouncedSearch}"`
              : 'Gõ SKU hoặc tên để tìm sản phẩm bán tại quầy'
          }
        />
      ) : (
        <List
          className="flex-1 overflow-auto"
          dataSource={rows}
          renderItem={(item) => {
            const price = item.unitPrice == null ? null : Number(item.unitPrice);
            const soldOut = item.availableQuantity < 1;
            const blockedReason =
              price == null
                ? 'Sản phẩm chưa có giá hiệu lực'
                : soldOut
                  ? 'Kho chi nhánh này đã hết hàng'
                  : undefined;
            return (
              <List.Item
                className="!px-1"
                actions={[
                  <Tooltip key="add" title={blockedReason}>
                    <Button
                      type={pickedIds.has(item.id) ? 'default' : 'primary'}
                      icon={<PlusOutlined />}
                      disabled={Boolean(blockedReason)}
                      onClick={() => onPick(item)}
                    >
                      {pickedIds.has(item.id) ? 'Thêm nữa' : 'Chọn'}
                    </Button>
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      {item.isBundle && (
                        <Tooltip
                          title={item.components
                            .map((component) => `${component.name} × ${component.quantity}`)
                            .join(' · ')}
                        >
                          <Tag color="purple">Combo {item.components.length} món</Tag>
                        </Tooltip>
                      )}
                    </div>
                  }
                  description={
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono text-slate-500">{item.sku}</span>
                      {price == null ? (
                        <Tag color="red">Chưa có giá</Tag>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          {moneyFormatter.format(price)}
                        </span>
                      )}
                      <Tag color={soldOut ? 'red' : item.availableQuantity <= 5 ? 'orange' : 'green'}>
                        {soldOut ? 'Hết hàng' : `Còn ${item.availableQuantity}`}
                      </Tag>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
