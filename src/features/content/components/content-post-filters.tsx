import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import { SearchInput } from '@/foundation/inputs/search-input';
import {
  fbOriginOptions,
  fbStatusOptions,
  postTypeOptions,
  SOCIAL_LIMITS,
  TIKTOK_ENABLED,
} from '../constants/social.constants';
import type { SocialListFilters } from '../model/social-post-filters';

type FilterPatch = Record<string, string | undefined>;

/** Hàng lọc của màn bài viết: ô tìm (state cục bộ, debounce ở hook) và các bộ lọc ghi lên URL. */
export function ContentPostFilters({
  filters,
  search,
  onSearchChange,
  onChange,
}: {
  filters: SocialListFilters;
  search: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: FilterPatch) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <SearchInput
        className="w-full"
        value={search}
        maxLength={SOCIAL_LIMITS.SEARCH_MAX}
        onChange={onSearchChange}
        placeholder="Tìm trong tiêu đề hoặc nội dung"
        aria-label="Tìm bài viết"
      />
      <Select
        allowClear
        className="w-full"
        value={filters.fbStatus}
        onChange={(value?: string) => onChange({ fbStatus: value })}
        placeholder="Trạng thái Facebook"
        options={fbStatusOptions}
      />
      {TIKTOK_ENABLED && (
        <Select
          allowClear
          className="w-full"
          value={filters.tiktokStatus}
          onChange={(value?: string) => onChange({ tiktokStatus: value })}
          placeholder="Trạng thái TikTok"
          options={fbStatusOptions}
        />
      )}
      <Select
        allowClear
        className="w-full"
        value={filters.postType}
        onChange={(value?: string) => onChange({ postType: value })}
        placeholder="Loại bài"
        options={postTypeOptions}
      />
      <Select
        allowClear
        className="w-full"
        value={filters.origin}
        onChange={(value?: string) => onChange({ origin: value })}
        placeholder="Nguồn"
        options={fbOriginOptions}
      />
      <DatePicker.RangePicker
        className="w-full"
        style={{ width: '100%' }}
        format="DD/MM/YYYY"
        allowEmpty={[true, true]}
        value={[filters.from ? dayjs(filters.from) : null, filters.to ? dayjs(filters.to) : null]}
        onChange={(dates) =>
          onChange({
            from: dates?.[0]?.format('YYYY-MM-DD'),
            to: dates?.[1]?.format('YYYY-MM-DD'),
          })
        }
      />
    </div>
  );
}
