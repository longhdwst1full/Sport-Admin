import { type ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps page content with a smooth fade & slide-up enter animation.
 * Uses the `animate-fade-in` and `animate-slide-up` Tailwind animations.
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in flex min-h-0 flex-1 flex-col ${className}`}>
      {children}
    </div>
  );
}
