import type { ReactNode } from "react";

interface RouteButtonProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: (e?: any) => void;
  className?: string;
  href?: string;
}

export default function RouteButton({
  children,
  selected = false,
  onClick,
  className = "",
  href,
}: RouteButtonProps) {
  const baseClasses = `rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] ${
    selected ? "font-semibold" : "font-normal"
  } ${className}`;

  if (href) {
    return (
      <a
        href={href}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick(e);
          }
        }}
        className={baseClasses}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
    >
      {children}
    </button>
  );
}
