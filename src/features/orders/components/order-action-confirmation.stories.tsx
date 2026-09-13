import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrderActionConfirmation } from './order-action-confirmation';

const meta = {
  title: 'Features/Orders/Action confirmation',
  component: OrderActionConfirmation,
  parameters: { layout: 'centered' },
  args: {
    action: 'cancel',
    reason: 'Khách xác nhận không còn nhu cầu mua',
    pending: false,
    onReasonChange: () => undefined,
    onCancel: () => undefined,
    onConfirm: () => undefined,
  },
} satisfies Meta<typeof OrderActionConfirmation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cancel: Story = {};

export const CompleteSameDay: Story = {
  args: {
    action: 'complete',
    reason: 'Đã giao trực tiếp, khách kiểm đủ hàng và cửa hàng nhận đủ tiền',
  },
};

export const ServerError: Story = {
  args: {
    errorMessage: 'Đơn hàng đã thay đổi; vui lòng tải lại trước khi hủy.',
  },
};
