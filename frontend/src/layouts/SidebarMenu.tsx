import type { ComponentType } from "react";
import {
  Bot,
  CircleDot,
  Compass,
  Gift,
  Github,
  GitPullRequest,
  Home,
  LayoutGrid,
  Link2,
  MessageCircle,
  Monitor,
  X,
} from "lucide-react";
import { RepoIcon } from "@primer/octicons-react";

interface SidebarMenuProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

function RepoIconGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return <RepoIcon size={size} className={className} />;
}

const PRIMARY_ITEMS: Array<{ key: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; pathFn: (base: string) => string }> = [
  { key: "home", label: "Home", icon: Home, pathFn: (base) => base },
  { key: "issues", label: "Issues", icon: CircleDot, pathFn: () => "/issues" },
  { key: "pulls", label: "Pull requests", icon: GitPullRequest, pathFn: () => "/pulls" },
  { key: "repositories", label: "Repositories", icon: RepoIconGlyph, pathFn: (base) => `${base}?tab=repositories` },
  { key: "projects", label: "Projects", icon: LayoutGrid, pathFn: () => "/projects" },
  { key: "discussions", label: "Discussions", icon: MessageCircle, pathFn: () => "/discussions" },
  { key: "codespaces", label: "Codespaces", icon: Monitor, pathFn: () => "/codespaces" },
  { key: "copilot", label: "Copilot", icon: Bot, pathFn: () => "/copilot" },
];

const SECONDARY_ITEMS: Array<{ key: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; path: string }> = [
  { key: "explore", label: "Explore", icon: Compass, path: "/explore" },
  { key: "marketplace", label: "Marketplace", icon: Gift, path: "/marketplace" },
  { key: "mcp-registry", label: "MCP registry", icon: Link2, path: "/mcp-registry" },
];

export default function SidebarMenu({ username, isOpen, onClose, onNavigate }: SidebarMenuProps) {
  if (!isOpen) return null;

  const profileBase = `/${encodeURIComponent(username)}`;

  const handleNav = (path: string) => {
    onClose();
    onNavigate(path);
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--overlay-backdrop)]"
      />

      <aside className="absolute left-0 top-0 h-full w-[320px] bg-[var(--surface-canvas)] border-r border-[var(--border-default)] shadow-xl flex flex-col">
        <div className="px-4 py-4 flex items-center justify-between">
          <Github size={30} className="text-[var(--text-primary)]" />
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="px-3 py-2 text-sm text-[var(--text-primary)] space-y-1">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNav(item.pathFn(profileBase))}
                className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3"
              >
                <Icon size={17} className="text-[var(--text-secondary)]" />
                <span className="text-base text-[var(--text-primary)]">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-4 my-2 border-t border-[var(--border-muted)]" />

        <div className="px-3 py-1 text-sm text-[var(--text-primary)] space-y-1">
          {SECONDARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNav(item.path)}
                className="w-full h-9 text-left px-2 rounded-md hover:bg-[var(--surface-subtle)] inline-flex items-center gap-3"
              >
                <Icon size={17} className="text-[var(--text-secondary)]" />
                <span className="text-base text-[var(--text-primary)]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
