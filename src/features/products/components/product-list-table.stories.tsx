import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ProductListRow } from '../model/product-list.mapper';
import { ProductListTable } from './product-list-table';

const demoRows: ProductListRow[] = [
  {
    id: '101',
    slug: 'may-chay-bo-mg-001',
    name: 'Máy chạy bộ đa năng MG-001',
    productNo: 'PRD-000101',
    secondaryLabel: 'PRD-000101 · MGSport · Máy chạy bộ',
    imageUrl: 'https://placehold.co/96x96/e2e8f0/475569?text=MG',
    priceLabel: '18.990.000 ₫',
    productType: 'SIMPLE',
    status: 'PUBLISHED',
    isPublished: true,
    version: 3,
  },
  {
    id: '102',
    slug: 'combo-home-gym-pro',
    name: 'Combo Home Gym Pro',
    productNo: 'PRD-000102',
    secondaryLabel: 'PRD-000102 · MGSport · Combo tập luyện',
    priceLabel: '—',
    productType: 'BUNDLE',
    status: 'DRAFT',
    isPublished: false,
    version: 1,
  },
];

const meta = {
  title: 'Features/Products/ListTable',
  component: ProductListTable,
  parameters: { layout: 'padded' },
  args: {
    rows: demoRows,
    loading: false,
    fetching: false,
    page: 1,
    pageSize: 20,
    total: demoRows.length,
    canManage: true,
    onPageChange: () => undefined,
    onOpen: () => undefined,
    onToggleVisibility: () => undefined,
    onArchive: () => undefined,
    onRefresh: () => undefined,
  },
} satisfies Meta<typeof ProductListTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const ReadOnly: Story = { args: { canManage: false } };
export const Loading: Story = { args: { rows: [], loading: true, total: 0 } };
export const Empty: Story = { args: { rows: [], total: 0 } };
