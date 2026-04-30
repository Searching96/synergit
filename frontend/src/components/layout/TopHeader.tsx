import type { ReactNode } from "react";
import {
  GitPullRequestIcon,
  InboxIcon,
  IssueOpenedIcon,
  MarkGithubIcon,
  PlusIcon,
  SearchIcon,
  ThreeBarsIcon,
} from "@primer/octicons-react";
import TooltipButton from "../shared/TooltipButton";

interface TopHeaderProps {
  leftContent: ReactNode;
  onMenuClick: () => void;
  menuAriaLabel?: string;
  onCreateClick?: () => void;
  onIssuesClick?: () => void;
  onPullsClick?: () => void;
  onInboxClick?: () => void;
  onProfileClick?: () => void;
  profileInitial?: string;
  searchPlaceholder?: string;
}

export default function TopHeader({
  leftContent,
  onMenuClick,
  menuAriaLabel = "Open menu",
  onCreateClick,
  onIssuesClick,
  onPullsClick,
  onInboxClick,
  onProfileClick,
  profileInitial = "U",
  searchPlaceholder = "Type / to search",
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
          <ThreeBarsIcon size={16} className="text-[var(--text-secondary)]" />
        </button>

        <span className="h-8 w-8 inline-flex items-center justify-center text-[var(--text-primary)] shrink-0">
          <MarkGithubIcon size={32} />
        </span>

        <div className="min-w-0 text-sm text-[var(--text-primary)] truncate">{leftContent}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden lg:block">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            readOnly
            placeholder={searchPlaceholder}
            className="h-8 w-[240px] rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] pl-9 pr-3 text-sm text-[var(--text-secondary)]"
          />
        </div>

        <button
          type="button"
          onClick={onIssuesClick || (() => undefined)}
          className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
          aria-label="Issues"
        >
          <IssueOpenedIcon size={16} />
        </button>

        <button
          type="button"
          onClick={onPullsClick || (() => undefined)}
          className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
          aria-label="Pull requests"
        >
          <GitPullRequestIcon size={16} />
        </button>

        <button
          type="button"
          onClick={onInboxClick || (() => undefined)}
          className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
          aria-label="Inbox"
        >
          <InboxIcon size={16} />
        </button>

        <div className="h-5 w-px bg-[var(--border-muted)]" />

        <button
          type="button"
          onClick={onCreateClick || (() => undefined)}
          className="h-8 w-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] text-[var(--text-secondary)] inline-flex items-center justify-center hover:bg-[var(--surface-subtle)]"
          aria-label="Create"
        >
          <PlusIcon size={16} />
        </button>

        <TooltipButton
          type="button"
          onClick={onProfileClick || (() => undefined)}
          className="h-8 w-8 rounded-full bg-black border border-[var(--border-default)] px-2 inline-flex items-center justify-center gap-1 text-xs font-semibold text-[var(--text-primary)]"
          aria-label="Open profile"
          tooltip="Open profile"
        >
          <span className="text-white">{(profileInitial.trim().charAt(0) || "U").toUpperCase()}</span>
        </TooltipButton>
      </div>
    </div>
  );
}
