export interface SearchableCatalogMaster {
  code: string;
  name: string;
  slug: string;
}

/** Lọc client-side không phân biệt hoa thường theo các trường `fields` (mặc định mã, tên, slug). */
export function filterCatalogMasters<T extends Partial<SearchableCatalogMaster>>(
  items: T[],
  search: string,
  fields: readonly (keyof SearchableCatalogMaster)[] = ['code', 'name', 'slug'],
): T[] {
  const normalized = search.trim().toLocaleLowerCase('vi');
  if (!normalized) return items;
  return items.filter((item) =>
    fields.some((field) => item[field]?.toLocaleLowerCase('vi').includes(normalized)),
  );
}
