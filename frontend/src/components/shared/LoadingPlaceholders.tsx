interface SpinnerPlaceholderProps {
  className?: string;
  label?: string;
  size?: number;
}

interface TextSkeletonProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

export function SpinnerPlaceholder({
  className = "",
  label = "Loading",
  size = 32,
}: SpinnerPlaceholderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-label={label} role="status">
      <span
        className="inline-block animate-spin rounded-full border-2 border-[#d0d7de] border-r-[#57606a]"
        style={{ height: size, width: size }}
      />
    </div>
  );
}

export function TextSkeleton({
  lines = 4,
  className = "",
  lineClassName = "",
}: TextSkeletonProps) {
  return (
    <div className={`space-y-1.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 rounded bg-[var(--surface-subtle)] ${lineClassName}`}
          style={{ width: `${index === lines - 1 ? 86 : 100}%` }}
        />
      ))}
    </div>
  );
}
