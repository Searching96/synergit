import { useState, type ReactNode } from "react";
import {
  GitPullRequestIcon,
  InboxIcon,
  IssueOpenedIcon,
  MarkGithubIcon,
  PlusIcon,
  SearchIcon,
  ThreeBarsIcon,
} from "@primer/octicons-react";
import { Accessibility, ArrowLeftRight, Book, Bot, Building2, Code, FlaskConical, Globe, Heart, LogOut, Paintbrush, Settings, Smile, Star, Upload, User } from "lucide-react";
import { Avatar } from "../components/shared/Avatar";

interface TopHeaderProps {
  leftContent: ReactNode;
  onMenuClick?: () => void;
  menuAriaLabel?: string;
  onCreateClick?: () => void;
  onIssuesClick?: () => void;
  onPullsClick?: () => void;
  onInboxClick?: () => void;
  onProfileClick?: () => void;
  onSearch?: (query: string) => void;
  onSignOut?: () => void;
  onSettings?: () => void;
  profileInitial?: string;
  profileName?: string;
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
  onSearch,
  onSignOut,
  onSettings,
  profileInitial = "U",
  profileName,
  searchPlaceholder = "Type / to search",
}: TopHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const menuGroups: { icon: typeof User; label: string; badge?: "New" | "Free"; onClick?: () => void }[][] = [
    [{ icon: Smile, label: "Set status" }],
    [
      { icon: User, label: "Profile", onClick: onProfileClick },
      { icon: Book, label: "Repositories" },
      { icon: Star, label: "Stars" },
      { icon: Code, label: "Gists" },
      { icon: Building2, label: "Organizations" },
      { icon: Globe, label: "Enterprises" },
      { icon: Heart, label: "Sponsors" },
    ],
    [
      { icon: Settings, label: "Settings", onClick: onSettings },
      { icon: Bot, label: "Copilot settings" },
      { icon: FlaskConical, label: "Feature preview", badge: "New" },
      { icon: Paintbrush, label: "Appearance" },
      { icon: Accessibility, label: "Accessibility" },
      { icon: Upload, label: "Try Enterprise", badge: "Free" },
    ],
    [{ icon: LogOut, label: "Sign out", onClick: onSignOut }],
  ];

  return (
    <div className="h-[42px] px-4 md:pl-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="h-9 w-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] inline-flex items-center justify-center hover:bg-[var(--surface-hover)]"
            aria-label={menuAriaLabel}
          >
            <ThreeBarsIcon size={16} className="text-[var(--text-secondary)]" />
          </button>
        ) : null}

        <span className="h-8 w-8 inline-flex items-center justify-center text-[var(--text-primary)] shrink-0">
          <MarkGithubIcon size={32} />
        </span>

        <div className="min-w-0 text-sm text-[var(--text-primary)] truncate">{leftContent}</div>
      </div>

      <div className="flex items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchText.trim()) onSearch?.(searchText.trim());
          }}
          className="relative hidden lg:block"
        >
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-[240px] rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] pl-9 pr-3 text-sm text-[var(--text-primary)]"
          />
        </form>

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

        <div className="relative">
          <Avatar 
            onClick={() => setMenuOpen((o) => !o)}
            ariaExpanded={menuOpen}
            username={profileName || profileInitial}
            size={32}
          />
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-lg py-2 text-sm text-[var(--text-primary)]">
                <div className="px-3 py-1.5 flex items-center justify-between w-full gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Avatar username={profileName || profileInitial} size={28} />
                    <span className="font-semibold truncate">{profileName || profileInitial}</span>
                  </span>
                  <ArrowLeftRight size={15} className="text-[var(--text-secondary)] shrink-0" />
                </div>
                {menuGroups.map((group, gi) => (
                  <div key={gi}>
                    {gi > 0 ? <div className="my-1 border-t border-[var(--border-muted)]" /> : null}
                    {group.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            item.onClick?.();
                          }}
                          className="w-full px-3 py-1.5 text-left inline-flex items-center gap-3 hover:bg-[var(--surface-subtle)]"
                        >
                          <Icon size={16} className="text-[var(--text-secondary)] shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge ? (
                            <span
                              className={`rounded-full border px-2 text-[11px] ${
                                item.badge === "New"
                                  ? "border-[var(--text-link)] text-[var(--text-link)]"
                                  : "border-[var(--border-default)] text-[var(--text-secondary)]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
