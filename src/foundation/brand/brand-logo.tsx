interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

/** Dùng cùng một asset nhận diện với Storefront, chỉ crop bằng CSS khi sidebar thu gọn. */
export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <span
        className={`block size-10 shrink-0 overflow-hidden rounded-xl bg-white shadow-soft transition-all duration-300 hover:shadow-glow-green ${className}`}
      >
        <img
          src="/images/logo.png"
          alt="Bảo An Sport"
          className="h-10 w-auto max-w-none object-contain"
        />
      </span>
    );
  }

  return (
    <img
      src="/images/logo.png"
      alt="Bảo An Sport"
      className={`block h-auto w-full max-w-[200px] object-contain transition-all duration-300 ${className}`}
    />
  );
}
