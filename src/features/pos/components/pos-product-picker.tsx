import { useState } from 'react';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Input, List, Skeleton, Tag, Tooltip } from 'antd';
import { useDebounce } from 'use-debounce';
import { useSearchActiveAdminProductVariants } from '@/generated/api/catalog/catalog';
import type { ActiveLookupOptionDto } from '@/generated/api/catalog/models';
import { getApiErrorMessage } from '@/lib/api/error';
import { moneyFormatter, POS_SEARCH_LIMIT } from '../constants/pos.constants';

export function PosProductPicker({
  onPick,
  pickedIds,
}: {
  onPick: (option: ActiveLookupOptionDto) => void;
  pickedIds: ReadonlySet<string>;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), 300);

  const variants = useSearchActiveAdminProductVariants({
    search: debouncedSearch || undefined,
    page: 1,
    limit: POS_SEARCH_LIMIT,
  });
  const rows = variants.data?.items ?? [];

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

      {variants.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tìm được sản phẩm"
          description={getApiErrorMessage(
            variants.error,
            'Kiểm tra lại kết nối rồi thử tìm lại.',
          )}
          action={<Button onClick={() => void variants.refetch()}>Thử lại</Button>}
        />
      )}

      {variants.isLoading ? (
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
          renderItem={(option) => {
            const price = option.priceAmount == null ? null : Number(option.priceAmount);
            const picked = pickedIds.has(option.id);
            return (
              <List.Item
                className="!px-1"
                actions={[
                  <Tooltip
                    key="add"
                    title={price == null ? 'Sản phẩm chưa có giá hiệu lực' : undefined}
                  >
                    <Button
                      type={picked ? 'default' : 'primary'}
                      icon={<PlusOutlined />}
                      disabled={price == null}
                      onClick={() => onPick(option)}
                    >
                      {picked ? 'Thêm nữa' : 'Chọn'}
                    </Button>
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{option.label}</span>
                    </div>
                  }
                  description={
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono text-slate-500">{option.code}</span>
                      {price == null ? (
                        <Tag color="red">Chưa có giá</Tag>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          {moneyFormatter.format(price)}
                        </span>
                      )}
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
