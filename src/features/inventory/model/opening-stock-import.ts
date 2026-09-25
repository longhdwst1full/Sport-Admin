/**
 * Đọc file CSV tồn đầu (`sku,so_luong`) để ghi phiếu OPENING_BALANCE hàng loạt cho một kho.
 *
 * Chỉ hỗ trợ CSV (Excel: "Lưu thành" → CSV UTF-8) để không thêm thư viện đọc XLSX. Chấp nhận dấu
 * phẩy hoặc chấm phẩy (Excel tiếng Việt thường xuất bằng `;`), BOM UTF-8 và dòng tiêu đề tuỳ chọn.
 */
export interface OpeningStockLine {
  /** Số dòng trong file (1-based) để báo lỗi đúng chỗ người dùng nhìn thấy trong Excel. */
  row: number;
  sku: string;
  quantity: number;
}

export interface OpeningStockParseResult {
  lines: OpeningStockLine[];
  errors: Array<{ row: number; message: string }>;
}

/** Số dòng mỗi phiếu: đủ nhỏ để một transaction không chạm timeout serverless. */
export const OPENING_STOCK_CHUNK_SIZE = 100;

const HEADER_SKU = new Set(['sku', 'ma', 'ma_hang', 'mã hàng', 'mã sku']);

function splitCsvRow(row: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '"') {
      if (quoted && row[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseOpeningStockCsv(text: string): OpeningStockParseResult {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstContent = rows.find((row) => row.trim()) ?? '';
  const delimiter = firstContent.includes(';') && !firstContent.includes(',') ? ';' : ',';
  const lines: OpeningStockLine[] = [];
  const errors: OpeningStockParseResult['errors'] = [];
  const seen = new Map<string, number>();

  rows.forEach((raw, index) => {
    const row = index + 1;
    if (!raw.trim()) return;
    const [rawSku = '', rawQuantity = ''] = splitCsvRow(raw, delimiter);
    if (lines.length === 0 && errors.length === 0 && HEADER_SKU.has(rawSku.toLowerCase())) return;
    const sku = rawSku.toUpperCase();
    if (!sku) {
      errors.push({ row, message: 'Thiếu SKU' });
      return;
    }
    const quantity = Number(rawQuantity.replace(/[.\s]/g, ''));
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({ row, message: `Số lượng "${rawQuantity}" phải là số nguyên dương` });
      return;
    }
    // Trùng SKU là lỗi, không tự cộng: thường là dán nhầm hai lần, cộng dồn sẽ nhân đôi tồn.
    const firstRow = seen.get(sku);
    if (firstRow !== undefined) {
      errors.push({ row, message: `SKU ${sku} trùng với dòng ${firstRow}` });
      return;
    }
    seen.set(sku, row);
    lines.push({ row, sku, quantity });
  });
  return { lines, errors };
}

export function chunkOpeningStock<T>(items: T[], size = OPENING_STOCK_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}
