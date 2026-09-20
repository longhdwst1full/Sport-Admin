interface BrandLogoProps {
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

/** Dùng cùng một asset nhận diện với Storefront, chỉ crop bằng CSS khi sidebar thu gọn. */
export function BrandLogo({ compact = false, dark = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-black text-xs shadow-md ${className}`}
        title="Bảo An Sport Admin"
      >
        BA
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-black text-xs shadow-sm">
        BA
      </span>
      <div className="min-w-0">
        <div
          className={`text-xs font-black tracking-wider uppercase ${
            dark ? 'text-white' : 'text-slate-900'
          }`}
        >
          BẢO AN SPORT
        </div>
        <div
          className={`text-[9.5px] font-bold tracking-widest uppercase ${
            dark ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          ADMIN PANEL
        </div>
      </div>
    </div>
  );
}
