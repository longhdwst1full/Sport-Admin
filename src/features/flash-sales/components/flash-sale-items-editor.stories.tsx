import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EditableItem } from '../model/flash-sale.mapper';
import { FlashSaleItemsEditor } from './flash-sale-items-editor';

const rows: EditableItem[] = Array.from({ length: 10 }, (_, index) => ({
  productVariantId: String(index + 1), sku: `DEMO-${index + 1}`, name: `Sản phẩm minh họa ${index + 1}`,
  basePrice: 100000, salePrice: 80000, quota: null, committed: 0, inactive: false,
}));

function EditorPreview(args: ComponentProps<typeof FlashSaleItemsEditor>) {
  const [items, setItems] = useState(args.items);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={client}>
      <FlashSaleItemsEditor {...args} items={items} onChange={setItems} enabled={false} />
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Features/FlashSales/ItemsEditor',
  component: FlashSaleItemsEditor,
  render: (args) => <EditorPreview {...args} />,
  args: { items: rows, enabled: false, showErrors: false, onChange: () => undefined },
} satisfies Meta<typeof FlashSaleItemsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TenProducts: Story = {};
export const ExistingSoldQuota: Story = {
  args: { items: rows.map((item, index) => index === 0
    ? { ...item, itemId: '11', quota: 10, committed: 6, original: { salePrice: 80000, quota: 10 } }
    : item) },
};
export const Empty: Story = { args: { items: [] } };
