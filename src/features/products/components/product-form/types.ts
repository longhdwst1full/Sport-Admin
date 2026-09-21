/** Hình dạng tối thiểu của một query tìm kiếm option mà các tab cần dùng. */
export interface SearchOptionsQuery {
  isFetching: boolean;
  data?: { items: Array<{ id: string; code: string; label: string }> };
}
