interface RepoBreadcrumbProps {
  rootLabel: string;
  segments: string[];
  onRootClick?: () => void;
  onSegmentClick?: (path: string) => void;
  isLastSegmentClickable?: boolean;
  showRootSeparatorWhenEmpty?: boolean;
  showTrailingSeparator?: boolean;
  className?: string;
  rootClassName?: string;
  segmentClassName?: string;
  lastSegmentClassName?: string;
  separatorClassName?: string;
}

export default function RepoBreadcrumb({
  rootLabel,
  segments,
  onRootClick,
  onSegmentClick,
  isLastSegmentClickable = true,
  showRootSeparatorWhenEmpty = false,
  showTrailingSeparator = false,
  className = "",
  rootClassName = "font-semibold text-[var(--text-link)]",
  segmentClassName = "text-[var(--text-link)] hover:underline",
  lastSegmentClassName = "text-[var(--text-primary)]",
  separatorClassName = "mx-1 text-[var(--text-muted)]",
}: RepoBreadcrumbProps) {
  const renderSeparator = () => (
    <span className={separatorClassName}>/</span>
  );

  return (
    <div className={className}>
      {onRootClick ? (
        <button
          type="button"
          onClick={onRootClick}
          className={rootClassName}
        >
          {rootLabel}
        </button>
      ) : (
        <span className={rootClassName}>{rootLabel}</span>
      )}

      {segments.length === 0 && showRootSeparatorWhenEmpty ? renderSeparator() : null}

      {segments.map((segment, index) => {
        const pathUntilSegment = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const canClick = !!onSegmentClick && (!isLast || isLastSegmentClickable);
        const textClassName = isLast ? lastSegmentClassName : segmentClassName;

        return (
          <span key={pathUntilSegment} className="inline-flex items-center">
            {renderSeparator()}
            {canClick ? (
              <button
                type="button"
                onClick={() => onSegmentClick?.(pathUntilSegment)}
                className={segmentClassName}
              >
                {segment}
              </button>
            ) : (
              <span className={textClassName}>{segment}</span>
            )}
          </span>
        );
      })}

      {segments.length > 0 && showTrailingSeparator ? renderSeparator() : null}
    </div>
  );
}
