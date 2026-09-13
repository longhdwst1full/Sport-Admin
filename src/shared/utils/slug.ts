/**
 * Converts a Vietnamese string into a URL-friendly slug.
 * Removes diacritics, converts special characters, trims whitespace and dashes.
 * Example: "Áo Thể Thao Nam" -> "ao-the-thao-nam"
 */
export function toSlug(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
