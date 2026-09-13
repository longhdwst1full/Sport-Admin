import React from 'react';

export interface CurrencyAmountProps {
  /** Numerical value or string amount */
  amount: number | string | null | undefined;
  /** Currency code, default: 'VND' */
  currency?: string;
  /** Locale, default: 'vi-VN' */
  locale?: string;
  /** Custom font size/weight CSS class */
  className?: string;
  /** Prefix to display before the amount */
  prefix?: React.ReactNode;
  /** Suffix to display after the amount */
  suffix?: React.ReactNode;
  /** Whether to show a '+' for positive values */
  showPositiveSign?: boolean;
  /** Automatically color green for positive, red for negative */
  colorByValue?: boolean;
  /** Format as compact (e.g. 1.2M, 500k) */
  compact?: boolean;
}

const defaultFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * CurrencyAmount component
 * Standardized money display across tables, metric cards, and summary sheets.
 * Inspired by dragon-admin-web typography foundation.
 */
export function CurrencyAmount({
  amount,
  currency = 'VND',
  locale = 'vi-VN',
  className = '',
  prefix,
  suffix,
  showPositiveSign = false,
  colorByValue = false,
  compact = false,
}: CurrencyAmountProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const isValid = !isNaN(num);

  if (!isValid) {
    return <span className={`text-slate-400 font-mono ${className}`}>0 ₫</span>;
  }

  let formatted = '';
  if (compact) {
    if (Math.abs(num) >= 1_000_000_000) {
      formatted = `${(num / 1_000_000_000).toFixed(1)}B ₫`;
    } else if (Math.abs(num) >= 1_000_000) {
      formatted = `${(num / 1_000_000).toFixed(1)}M ₫`;
    } else if (Math.abs(num) >= 1_000) {
      formatted = `${(num / 1_000).toFixed(0)}k ₫`;
    } else {
      formatted = defaultFormatter.format(num);
    }
  } else if (currency === 'VND' && locale === 'vi-VN') {
    formatted = defaultFormatter.format(num);
  } else {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  }

  const sign = showPositiveSign && num > 0 ? '+' : '';
  const colorClass = colorByValue
    ? num > 0
      ? 'text-emerald-600 font-semibold'
      : num < 0
        ? 'text-rose-600 font-semibold'
        : 'text-slate-600'
    : '';

  return (
    <span className={`inline-flex items-center tabular-nums ${colorClass} ${className}`}>
      {prefix && <span className="mr-1">{prefix}</span>}
      {sign}
      {formatted}
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
}
