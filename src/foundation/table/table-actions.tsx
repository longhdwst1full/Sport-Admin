import { Button, Space, Tooltip } from 'antd';
import type { ButtonProps, SpaceProps, TooltipProps } from 'antd';
import type { ReactNode } from 'react';

export interface TableActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  size?: SpaceProps['size'];
}

/** Nhóm action icon thống nhất cho cột thao tác; không render text trong cell. */
export function TableActions({ children, align = 'right', size = 4 }: TableActionsProps) {
  const justifyClass =
    align === 'left' ? 'justify-start' : align === 'center' ? 'justify-center' : 'justify-end';
  return (
    <Space size={size} className={`flex w-full items-center ${justifyClass}`}>
      {children}
    </Space>
  );
}

export interface TableActionButtonProps
  extends Omit<ButtonProps, 'aria-label' | 'children' | 'icon'> {
  label: string;
  icon: ReactNode;
  tooltipProps?: Omit<TooltipProps, 'title' | 'children'>;
}

/**
 * Action trong table bắt buộc có tooltip và aria-label; phần nhìn chỉ hiển thị icon
 * để cột action giữ width nhỏ, ổn định trên mọi màn hình.
 */
export function TableActionButton({
  label,
  icon,
  tooltipProps,
  type = 'text',
  size = 'small',
  ...buttonProps
}: TableActionButtonProps) {
  return (
    <Tooltip title={label} {...tooltipProps}>
      <span className="inline-flex">
        <Button
          {...buttonProps}
          type={type}
          size={size}
          aria-label={label}
          icon={icon}
          className={`!rounded-lg ${buttonProps.className ?? ''}`.trim()}
        />
      </span>
    </Tooltip>
  );
}
