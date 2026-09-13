import { Button, type ButtonProps } from 'antd';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    type?: ButtonProps['type'];
    icon?: ReactNode;
  };
}

/**
 * Reusable empty state — used when tables / lists have no data.
 * CSS-animated icon circle with subtle gradient.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center animate-fade-in">
      {/* Icon container */}
      <div className="relative mb-2">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-admin-200 to-sky-100 opacity-40 blur-xl" />
        <div className="relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-slate-50 to-slate-100 text-3xl text-slate-400 shadow-inner-border">
          {icon ?? '📭'}
        </div>
      </div>

      {/* Text */}
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-slate-700">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}
      </div>

      {/* Action */}
      {action && (
        <Button
          type={action.type ?? 'primary'}
          icon={action.icon}
          className="mt-2"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
