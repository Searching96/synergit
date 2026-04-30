import type { ButtonHTMLAttributes, ReactNode } from "react";

export type TooltipButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string | null;
  children?: ReactNode;
};

export default function TooltipButton({
  tooltip,
  className,
  children,
  ...buttonProps
}: TooltipButtonProps) {
  const tooltipText = tooltip?.trim();
  const showTooltip = Boolean(tooltipText);
  const mergedClassName = className ? `${className} relative group` : "relative group";

  return (
    <button {...buttonProps} className={mergedClassName}>
      {children}
      {showTooltip ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 bottom-full mb-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-50"
        >
          {/* NOTICE: The [] brackets are gone. We are using the native names we defined in the config */}
          <span className="whitespace-nowrap rounded-md border border-border-default bg-surface-canvas px-2 py-1 text-xs text-text-primary shadow-lg">
            {tooltipText}
          </span>
        </span>
      ) : null}
    </button>
  );
}