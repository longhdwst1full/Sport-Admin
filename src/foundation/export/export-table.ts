/**
 * Export table data to CSV with UTF-8 BOM so Vietnamese characters display properly in Excel.
 * Inspired by dragon-admin-web export utility.
 */
export function exportTableToCsv<T extends Record<string, any>>({
  filename = 'danh-sach.csv',
  columns,
  data,
}: {
  filename?: string;
  columns: Array<{ key: string; label: string; format?: (value: any, row: T) => string }>;
  data: T[];
}) {
  if (!data || data.length === 0) return;

  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.format ? col.format(row[col.key], row) : row[col.key];
        const val = raw === null || raw === undefined ? '' : String(raw);
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
