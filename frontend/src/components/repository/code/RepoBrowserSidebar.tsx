import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  FileDirectoryFillIcon,
  FileDirectoryOpenFillIcon,
  FileIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
} from "@primer/octicons-react";
import type { Branch, RepoFile } from "../../../types";
import BranchTagMenu from "./BranchTagMenu";

type RepoBrowserSidebarProps = {
  branches: Branch[];
  currentBranch: string;
  isBranchMenuOpen: boolean;
  onBranchMenuOpenChange: (open: boolean) => void;
  onSelectBranch: (branchName: string) => void;
  actions?: ReactNode;
  entriesByPath: Record<string, RepoFile[]>;
  expandedDirs: Set<string>;
  currentDirPath: string;
  selectedFilePath?: string | null;
  normalizePath: (path: string) => string;
  onToggleDirectory: (path: string, nextExpanded: boolean) => void;
  onDirectoryClick: (path: string) => void;
  onFileClick?: (path: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOverlayVisible?: boolean;
  onCloseMenus?: () => void;
  overlayAriaLabel?: string;
  controlsClassName?: string;
  asideClassName?: string;
  showGoToFileInput?: boolean;
};

export default function RepoBrowserSidebar({
  branches,
  currentBranch,
  isBranchMenuOpen,
  onBranchMenuOpenChange,
  onSelectBranch,
  actions,
  entriesByPath,
  expandedDirs,
  currentDirPath,
  selectedFilePath,
  normalizePath,
  onToggleDirectory,
  onDirectoryClick,
  onFileClick,
  isCollapsed = false,
  onToggleCollapse,
  isOverlayVisible = false,
  onCloseMenus,
  overlayAriaLabel,
  controlsClassName,
  asideClassName,
  showGoToFileInput = true,
}: RepoBrowserSidebarProps) {
  const renderTreeNodes = (path: string, depth: number): ReactNode[] => {
    const normalized = normalizePath(path);
    const entries = entriesByPath[normalized] || [];

    return entries.map((entry) => {
      const isDirectory = entry.type === "DIR";
      const isExpanded = isDirectory && expandedDirs.has(entry.path);
      const isActive = selectedFilePath ? selectedFilePath === entry.path : currentDirPath === entry.path;

      return (
        <li key={entry.path}>
          <div
            className="flex items-center"
            style={{ paddingLeft: `${Math.max(0, depth * 10)}px` }}
          >
            {isDirectory ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  const nextExpanded = !expandedDirs.has(entry.path);
                  onToggleDirectory(entry.path, nextExpanded);
                }}
                className="h-6 w-5 shrink-0 inline-flex items-center justify-center text-[var(--text-secondary)]"
                aria-label={isExpanded ? "Collapse directory" : "Expand directory"}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="h-6 w-5 shrink-0" />
            )}

            <button
              type="button"
              onClick={() => {
                if (isDirectory) {
                  onDirectoryClick(entry.path);
                } else {
                  onFileClick?.(entry.path);
                }
              }}
              className={`flex-1 h-6 pr-2 text-left text-sm rounded-sm inline-flex items-center gap-2 ${
                isActive
                  ? "bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              {isDirectory ? (
                isExpanded ? (
                  <FileDirectoryOpenFillIcon size={17} className="text-[#54aeff] shrink-0" />
                ) : (
                  <FileDirectoryFillIcon size={17} className="text-[#54aeff] shrink-0" />
                )
              ) : (
                <FileIcon size={17} className="text-[var(--text-secondary)] shrink-0" />
              )}
              <span className="truncate text-[15px]">{entry.name}</span>
            </button>
          </div>

          {isDirectory && isExpanded ? (
            <ul>{renderTreeNodes(entry.path, depth + 1)}</ul>
          ) : null}
        </li>
      );
    });
  };

  return (
    <aside
      className={`sticky top-0 self-start border-r border-[var(--border-default)] flex flex-col${
        asideClassName ? ` ${asideClassName}` : ""
      }`}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={isCollapsed ? "Expand file tree" : "Collapse file tree"}
          aria-controls="repos-file-tree"
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand file tree" : "Collapse file tree"}
          onClick={onToggleCollapse}
          className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
        >
          {isCollapsed ? <SidebarExpandIcon size={18} /> : <SidebarCollapseIcon size={18} />}
        </button>
        <span className={isCollapsed ? "sr-only" : "text-base font-semibold text-[var(--text-primary)]"}>Files</span>
      </div>
      {!isCollapsed ? (
        <>
          <div className="px-3 py-2 space-y-2">
            <div className={`flex items-center ${controlsClassName ?? "gap-2"}`}>
              {isOverlayVisible && onCloseMenus ? (
                <button
                  type="button"
                  aria-label={overlayAriaLabel || "Close menus"}
                  onClick={onCloseMenus}
                  className="fixed inset-0 z-10"
                />
              ) : null}

              <BranchTagMenu
                className="relative z-20 flex-1 min-w-0"
                branches={branches}
                currentBranch={currentBranch}
                isOpen={isBranchMenuOpen}
                onOpenChange={onBranchMenuOpenChange}
                onSelectBranch={onSelectBranch}
              />

              {actions}
            </div>

            {showGoToFileInput ? (
              <div className="relative">
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  readOnly
                  placeholder="Go to file"
                  className="w-full h-9 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-8 pr-3 text-base text-[var(--text-secondary)]"
                />
              </div>
            ) : null}
          </div>

          <div id="repos-file-tree" className="px-2 py-2 flex-1 min-h-0 overflow-auto">
            <ul>{renderTreeNodes("", 0)}</ul>
          </div>
        </>
      ) : null}
    </aside>
  );
}
