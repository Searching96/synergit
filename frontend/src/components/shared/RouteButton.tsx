import type { ReactNode } from "react";

interface RouteButtonProps {
  children: ReactNode;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}

export default function RouteButton({
  children,
  selected = false,
  onClick,
  className = "",
}: RouteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] ${
        selected ? "font-semibold" : "font-normal"
      } ${className}`}
    >
      {children}
    </button>
  );
}
