import type { ReactNode } from "react";
import { Bell, Menu, Plus, Search } from "lucide-react";

export interface TopHeaderAction {
  label: string;
  onClick: () => void;
}

interface TopHeaderProps {
  badgeText?: string;
  leftContent: ReactNode;
  onMenuClick: () => void;
  menuAriaLabel?: string;
  onCreateClick?: () => void;
  onNotificationsClick?: () => void;
  searchPlaceholder?: string;
  actions?: TopHeaderAction[];
}

export default function TopHeader({
  badgeText = "GH",
  leftContent,
  onMenuClick,
  menuAriaLabel = "Open menu",
  onCreateClick,
  onNotificationsClick,
  searchPlaceholder = "Type / to search",
  actions = [],
}: TopHeaderProps) {
  return (
    <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] inline-flex items-center justify-center hover:bg-[var(--surface-hover)]"
          aria-label={menuAriaLabel}
        >
          <Menu size={16} className="text-[var(--text-secondary)]" />
        </button>

        <div className="h-8 w-8 rounded-full bg-[var(--text-primary)] text-[var(--text-on-accent)] text-sm font-semibold inline-flex items-center justify-center shrink-0">
          {badgeText}
        </div>

        <div className="min-w-0 text-sm text-[var(--text-primary)] truncate">{leftContent}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            readOnly
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-sm text-[var(--text-secondary)]"
          />
        </div>

        <button
          type="button"
          onClick={onCreateClick || (() => undefined)}
          className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
          aria-label="Create"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          onClick={onNotificationsClick || (() => undefined)}
          className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>

        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
