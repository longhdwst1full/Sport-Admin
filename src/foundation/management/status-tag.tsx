export interface StatusPresentation {
  label: string;
  color: string;
}

interface StatusTagProps<TStatus extends string> {
  status: TStatus;
  presentations: Record<TStatus, StatusPresentation>;
}

const dotColorMap: Record<string, { badge: string; dot: string }> = {
  green: {
    badge: 'text-emerald-700 bg-emerald-50 border border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  blue: {
    badge: 'text-blue-700 bg-blue-50 border border-blue-500/25',
    dot: 'bg-blue-500',
  },
  gold: {
    badge: 'text-amber-700 bg-amber-50 border border-amber-500/25',
    dot: 'bg-amber-500',
  },
  red: {
    badge: 'text-rose-700 bg-rose-50 border border-rose-500/25',
    dot: 'bg-rose-500',
  },
  purple: {
    badge: 'text-violet-700 bg-violet-50 border border-violet-500/25',
    dot: 'bg-violet-500',
  },
  cyan: {
    badge: 'text-cyan-700 bg-cyan-50 border border-cyan-500/25',
    dot: 'bg-cyan-500',
  },
  orange: {
    badge: 'text-orange-700 bg-orange-50 border border-orange-500/25',
    dot: 'bg-orange-500',
  },
  default: {
    badge: 'text-slate-700 bg-slate-100 border border-slate-200',
    dot: 'bg-slate-400',
  },
};

/**
 * Premium status indicator with colored dot — Linear/GitHub style.
 * Fully responsive, prevents line breaks (whitespace-nowrap), with balanced padding.
 */
export function StatusTag<TStatus extends string>({
  status,
  presentations,
}: StatusTagProps<TStatus>) {
  const presentation = presentations[status];
  if (!presentation) return null;

  const styleConfig = dotColorMap[presentation.color] ?? dotColorMap.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 select-none shadow-2xs ${styleConfig.badge}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${styleConfig.dot}`} />
      <span className="leading-tight">{presentation.label}</span>
    </span>
  );
}
