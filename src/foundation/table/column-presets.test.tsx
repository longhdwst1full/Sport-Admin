import { describe, expect, it } from 'vitest';
import { col, EMPTY_CELL } from './column-presets';

type Row = { name?: string | null; total?: number; createdAt?: string | null };

describe('col presets', () => {
  it('text hiện — khi rỗng và cho ghi đè thuộc tính', () => {
    const column = col.text<Row>('name', 'Tên', { width: 200 });
    expect(column.dataIndex).toBe('name');
    expect(column.width).toBe(200);
    expect(column.render?.(null, {}, 0)).toBe(EMPTY_CELL);
    expect(column.render?.('A', {}, 0)).toBe('A');
  });

  it('number và money căn phải', () => {
    expect(col.number<Row>('total', 'SL').align).toBe('right');
    expect(col.money<Row>('total', 'Tiền').align).toBe('right');
    expect(col.money<Row>('total', 'Tiền').render?.(undefined, {}, 0)).toBe(EMPTY_CELL);
  });

  it('dateTime rỗng hiện —', () => {
    expect(col.dateTime<Row>('createdAt', 'Tạo lúc').render?.(null, {}, 0)).toBe(EMPTY_CELL);
  });

  it('actions cố định bên phải với key actions', () => {
    const column = col.actions<Row>(() => null);
    expect(column.key).toBe('actions');
    expect(column.fixed).toBe('right');
  });
});
