import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface TooltipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string | null;
  children?: ReactNode;
}

export default function TooltipButton({
  tooltip,
  className,
  children,
  ...buttonProps
}: TooltipButtonProps) {
  const tooltipText = (tooltip ?? "").trim();
  const showTooltip = tooltipText.length > 0;
  
  // Using template literals here is safer for Babel
  const mergedClassName = className ? `relative group ${className}` : `relative group`;

  return (
    <button {...buttonProps} className={mergedClassName}>
      {children}
      {showTooltip && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 bottom-full mb-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-50`}
        >
          <span 
            className={`whitespace-nowrap rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-lg`}
          >
            {tooltipText}
          </span>
        </span>
      )}
    </button>
  );
}