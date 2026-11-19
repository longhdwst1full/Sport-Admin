/**
 * SECURITY: ô bắt đầu bằng `= + - @` (hoặc tab/CR) bị Excel/Sheets hiểu là công thức (CSV injection, ví dụ
 * dữ liệu nhập `=HYPERLINK(...)`). Thêm `'` đầu ô để thành chữ thuần. Số thập phân thuần (`-15`, `-15.5`)
 * giữ nguyên; chuỗi bắt đầu bằng `+` (kể cả số điện thoại `+84…`) vẫn bị thêm `'` — đánh đổi chấp nhận được.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function neutralizeCsvFormula(value: string): string {
  return FORMULA_PREFIX.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}

/**
 * Export table data to CSV with UTF-8 BOM so Vietnamese characters display properly in Excel.
 * Inspired by dragon-admin-web export utility.
 */
export function exportTableToCsv<T extends object>({
  filename = 'danh-sach.csv',
  columns,
  data,
}: {
  filename?: string;
  columns: Array<{ key: string; label: string; format?: (value: unknown, row: T) => string }>;
  data: T[];
}) {
  if (!data || data.length === 0) return;

  const headerRow = columns.map((col) => `"${neutralizeCsvFormula(col.label).replace(/"/g, '""')}"`).join(',');

  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const cell = (row as Record<string, unknown>)[col.key];
        const raw = col.format ? col.format(cell, row) : cell;
        const val = neutralizeCsvFormula(raw === null || raw === undefined ? '' : String(raw));
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
