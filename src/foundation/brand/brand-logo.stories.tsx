import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandLogo } from './brand-logo';

const meta = {
  title: 'Foundation/BrandLogo',
  component: BrandLogo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Logo dùng chung nhận diện Bảo An Sport cho login, header và sidebar thu gọn.',
      },
    },
  },
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  args: {},
  decorators: [(StoryComponent) => <div className="w-64 bg-white p-5"><StoryComponent /></div>],
};

export const Compact: Story = {
  args: { compact: true },
};
