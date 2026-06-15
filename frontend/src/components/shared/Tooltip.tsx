import { useState, cloneElement, isValidElement, type ReactNode } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useInteractions,
  useRole,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react";

export interface TooltipProps {
  content?: ReactNode;
  children: ReactNode;
  placement?: Placement;
}

export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 })
    ],
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role]);

  if (!content) {
    return <>{children}</>;
  }

  const child = isValidElement(children) ? children : <span>{children}</span>;

  return (
    <>
      {cloneElement(child, getReferenceProps({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref: refs.setReference as any,
        ...child.props
      }))}
      
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 1000 }}
            className="pointer-events-none whitespace-nowrap rounded-[4px] bg-[#25292E] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-md"
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
