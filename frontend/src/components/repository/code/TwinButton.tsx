import type { ReactNode } from "react";
import TooltipButton from "../../ui/TooltipButton";

type TwinButtonProps = {
  leftAriaLabel: string;
  rightAriaLabel: string;
  leftIcon: ReactNode;
  rightIcon: ReactNode;
  onLeftClick?: () => void;
  onRightClick?: () => void;
  leftTitle?: string;
  rightTitle?: string;
  className?: string;
  leftButtonClassName?: string;
  rightButtonClassName?: string;
};

export default function TwinButton({
  leftAriaLabel,
  rightAriaLabel,
  leftIcon,
  rightIcon,
  onLeftClick,
  onRightClick,
  leftTitle,
  rightTitle,
  className,
  leftButtonClassName,
  rightButtonClassName,
}: TwinButtonProps) {
  const wrapperClassName = `flex items-center${className ? ` ${className}` : ""}`;
  const leftClassName = `h-9 w-9 rounded-l-md border border-r-0 border-[var(--border-default)] bg-[var(--surface-canvas)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]${leftButtonClassName ? ` ${leftButtonClassName}` : ""}`;
  const rightClassName = `h-9 w-9 rounded-r-md border border-[var(--border-default)] bg-[var(--surface-canvas)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]${rightButtonClassName ? ` ${rightButtonClassName}` : ""}`;

  return (
    <div className={wrapperClassName}>
      <TooltipButton
        type="button"
        onClick={onLeftClick}
        className={leftClassName}
        aria-label={leftAriaLabel}
        title={leftTitle}
      >
        {leftIcon}
      </TooltipButton>

      <TooltipButton
        type="button"
        onClick={onRightClick}
        className={rightClassName}
        aria-label={rightAriaLabel}
        title={rightTitle}
      >
        {rightIcon}
      </TooltipButton>
    </div>
  );
}
