interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

/** Dùng cùng một asset nhận diện với Storefront, chỉ crop bằng CSS khi sidebar thu gọn. */
export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <span
        className={`block size-11 shrink-0 overflow-hidden rounded-full bg-white ${className}`}
      >
        <img
          src="/images/logo.png"
          alt="Bảo An Sport"
          className="h-11 w-auto max-w-none object-contain"
        />
      </span>
    );
  }

  return (
    <img
      src="/images/logo.png"
      alt="Bảo An Sport"
      className={`block h-auto w-full max-w-[214px] object-contain ${className}`}
    />
  );
}
