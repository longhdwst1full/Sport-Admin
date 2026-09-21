import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useDebounce } from 'use-debounce';

export interface AsyncPage<T> {
  items: T[];
  hasMore: boolean;
}

export interface AsyncPagedSelectProps<T> extends Omit<SelectProps, 'options' | 'onSearch' | 'loading'> {
  /** Khoá cache; phải chứa mọi tham số ngoài `search`/`page` mà `fetchPage` dùng tới. */
  queryKey: readonly unknown[];
  fetchPage: (args: { search: string; page: number; limit: number }) => Promise<AsyncPage<T>>;
  toOption: (item: T) => { value: string; label: string; disabled?: boolean };
  /**
   * Nhận cả bản ghi gốc khi người dùng chọn.
   *
   * Nhiều màn cần chính đối tượng vừa chọn (giá, tồn, combo) chứ không chỉ id; tra lại bằng id sẽ
   * là một lượt gọi nữa cho thứ vừa có trong tay.
   */
  onSelectItem?: (item: T) => void;
  /** Nội dung giàu cho từng dòng; bỏ trống thì dùng `label`. */
  renderOption?: (item: T) => ReactNode;
  /**
   * Option ghim sẵn cho giá trị đang chọn. Giá trị đã lưu có thể không nằm trong trang đầu, và
   * không có dòng này thì ô hiển thị trơ mã số thay vì tên.
   */
  seedOptions?: Array<{ value: string; label: string }>;
  pageSize?: number;
  debounceMs?: number;
  /** Chỉ gọi API khi đủ điều kiện (ví dụ đã chọn chi nhánh). */
  enabled?: boolean;
  /** Dữ liệu ít đổi thì đặt dài để mở lại danh sách không phải chờ mạng lần nữa. */
  staleTimeMs?: number;
}

/**
 * Select tải dữ liệu theo trang, cuộn tới đâu gọi tới đó.
 *
 * Danh sách dài không thể tải hết một lượt: sáu trăm sản phẩm là sáu trăm dòng đi qua mạng cho một
 * ô chọn mà người dùng thường chỉ gõ vài ký tự rồi chọn. Ô này gọi trang đầu khi mở, và chỉ gọi
 * trang sau khi người dùng thật sự cuộn xuống cuối.
 *
 * Tìm kiếm chạy **trên server**: lọc trong danh sách đã tải chỉ đúng với trang đang có trong tay,
 * nên gõ một từ nằm ở trang 5 sẽ ra "không có kết quả" dù dữ liệu tồn tại.
 *
 * react-query giữ cache theo `queryKey` + từ khoá, nên mở lại cùng một ô với cùng từ khoá không tạo
 * thêm lượt gọi nào.
 */
export function AsyncPagedSelect<T>({
  queryKey,
  fetchPage,
  toOption,
  renderOption,
  seedOptions = [],
  pageSize = 20,
  debounceMs = 300,
  enabled = true,
  staleTimeMs,
  onSelectItem,
  ...selectProps
}: AsyncPagedSelectProps<T>) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search.trim(), debounceMs);
  const [open, setOpen] = useState(false);

  const query = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearch, pageSize],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchPage({ search: debouncedSearch, page: pageParam as number, limit: pageSize }),
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined),
    // Chỉ gọi khi danh sách thực sự được mở: một màn có mười ô chọn không nên tạo mười lượt gọi
    // ngay khi hiện ra.
    enabled: enabled && open,
    ...(staleTimeMs === undefined ? {} : { staleTime: staleTimeMs }),
  });

  const loaded = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  );

  const options = useMemo(() => {
    const fetched = loaded.map((item) => ({ ...toOption(item), item }));
    const fetchedValues = new Set(fetched.map((option) => option.value));
    // Option ghim đứng trước và không bị trùng với dữ liệu vừa tải về.
    return [
      ...seedOptions
        .filter((option) => !fetchedValues.has(option.value))
        .map((option) => ({ ...option, item: undefined as T | undefined })),
      ...fetched,
    ];
  }, [loaded, seedOptions, toOption]);

  return (
    <Select
      showSearch
      // Lọc chạy trên server; để antd lọc lại sẽ giấu mất kết quả server vừa trả về.
      filterOption={false}
      onSearch={setSearch}
      onDropdownVisibleChange={(visible) => {
        setOpen(visible);
        if (!visible) setSearch('');
      }}
      loading={query.isFetching && !query.isFetchingNextPage}
      onPopupScroll={(event) => {
        const target = event.currentTarget;
        // Chạm gần đáy thì nạp trang kế; 48px đệm để không phải cuộn tới sát mép mới tải.
        const reachedBottom =
          target.scrollTop + target.offsetHeight >= target.scrollHeight - 48;
        if (reachedBottom && query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      options={options}
      onChange={(value, option) => {
        const picked = options.find((candidate) => candidate.value === value)?.item;
        if (picked) onSelectItem?.(picked);
        selectProps.onChange?.(value, option);
      }}
      optionRender={
        renderOption
          ? (option) => {
              const found = options.find((candidate) => candidate.value === option.value);
              return found?.item ? renderOption(found.item) : option.label;
            }
          : undefined
      }
      notFoundContent={
        query.isFetching ? (
          <div className="py-2 text-center">
            <Spin size="small" />
          </div>
        ) : undefined
      }
      dropdownRender={(menu) => (
        <>
          {menu}
          {query.isFetchingNextPage && (
            <div className="py-2 text-center text-xs text-slate-500">Đang tải thêm…</div>
          )}
        </>
      )}
      {...selectProps}
    />
  );
}
