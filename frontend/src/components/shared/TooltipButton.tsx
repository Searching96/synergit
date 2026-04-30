import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useInteractions,
  FloatingPortal
} from "@floating-ui/react";

export type TooltipButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string | null;
  children?: ReactNode;
};

export default function TooltipButton({
  tooltip,
  className = "",
  children,
  ...buttonProps
}: TooltipButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const tooltipText = tooltip?.trim();
  const showTooltip = Boolean(tooltipText);

  // Dynamically resolve tooltip coordinates to guarantee viewport visibility
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 })
    ],
  });

  const hover = useHover(context);
  const focus = useFocus(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus]);

  return (
    <>
      <button
        ref={refs.setReference}
        className={className}
        {...getReferenceProps(buttonProps)}
      >
        {children}
      </button>

      {showTooltip && isOpen && (
        // Mount at the document root to bypass parent stacking contexts and overflow clipping
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 pointer-events-none whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs text-white shadow-lg"
            {...getFloatingProps()}
          >
            {tooltipText}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}