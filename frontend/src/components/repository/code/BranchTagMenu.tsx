import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Branch } from "../../../types";

interface BranchTagMenuProps {
  branches: Branch[];
  currentBranch: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBranch: (branchName: string) => void;
  onCreateBranch?: (branchName: string, fromBranch: string) => Promise<void> | void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuAlign?: "left" | "right";
  onViewAllBranches?: () => void;
  label?: string;
}

function isCommitLikeRef(value: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(value.trim());
}

function shortHash(hash: string): string {
  return hash.trim().slice(0, 7);
}

function GitBranchOcticon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      data-component="Octicon"
      aria-hidden="true"
      focusable="false"
      className={`octicon octicon-git-branch fill-current ${className}`}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      display="inline-block"
      overflow="visible"
      style={{ verticalAlign: "text-bottom" }}
    >
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

export default function BranchTagMenu({
  branches,
  currentBranch,
  isOpen,
  onOpenChange,
  onSelectBranch,
  onCreateBranch,
  className,
  triggerClassName,
  menuClassName,
  menuAlign = "left",
  onViewAllBranches,
  label,
}: BranchTagMenuProps) {
  const [menuTab, setMenuTab] = useState<"branches" | "tags">("branches");
  const [query, setQuery] = useState<string>("");
  const [creatingBranch, setCreatingBranch] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const activeBranch = (currentBranch || "master").trim() || "master";
  const requestedBranchName = query.trim();

  const items = useMemo(() => {
    const knownBranchMap = new Map(branches.map((item) => [item.name, item]));
    const values = activeBranch && !knownBranchMap.has(activeBranch)
      ? [activeBranch, ...branches.map((item) => item.name)]
      : branches.map((item) => item.name);

    return values.map((name) => {
      const matchedBranch = knownBranchMap.get(name);
      return {
        value: name,
        label: !matchedBranch && isCommitLikeRef(name) ? shortHash(name) : name,
        isDefault: !!matchedBranch?.is_default,
        isCurrent: name === activeBranch,
      };
    });
  }, [activeBranch, branches]);

  const activeBranchLabel = useMemo(() => {
    const matchedBranch = branches.some((item) => item.name === activeBranch);
    return !matchedBranch && isCommitLikeRef(activeBranch) ? shortHash(activeBranch) : activeBranch;
  }, [activeBranch, branches]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      return item.value.toLowerCase().includes(normalizedQuery) || item.label.toLowerCase().includes(normalizedQuery);
    });
  }, [items, query]);

  const canCreateBranch = useMemo(() => {
    if (!onCreateBranch || menuTab !== "branches" || !requestedBranchName) {
      return false;
    }

    if (isCommitLikeRef(activeBranch)) {
      return false;
    }

    return !items.some((item) => item.value.toLowerCase() === requestedBranchName.toLowerCase());
  }, [activeBranch, items, menuTab, onCreateBranch, requestedBranchName]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setQuery("");
    setMenuTab("branches");
    setCreatingBranch(false);
    setCreateError(null);
  }, [isOpen]);

  const resetMenu = () => {
    onOpenChange(false);
    setQuery("");
    setMenuTab("branches");
    setCreatingBranch(false);
    setCreateError(null);
  };

  const handleCreateBranch = async () => {
    if (!canCreateBranch || !onCreateBranch) {
      return;
    }

    try {
      setCreatingBranch(true);
      setCreateError(null);
      await onCreateBranch(requestedBranchName, activeBranch);
      onSelectBranch(requestedBranchName);
      resetMenu();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setCreatingBranch(false);
    }
  };

  const wrapperClassName = className || "relative";
  const computedTriggerClassName = `inline-flex w-full min-w-0 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-2 pr-2 h-8 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] ${triggerClassName || ""}`;
  const menuAlignClassName = menuAlign === "right" ? "right-0" : "left-0";
  const computedMenuClassName = menuClassName || `absolute ${menuAlignClassName} top-[calc(100%+6px)] w-[320px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl overflow-hidden z-40`;

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className={computedTriggerClassName}
      >
        <GitBranchOcticon size={16} className="text-[var(--text-secondary)] shrink-0" />
        <span className="truncate">{label ? <><span className="text-[var(--text-secondary)]">{label}: </span>{activeBranchLabel}</> : activeBranchLabel}</span>
        <ChevronDown size={16} className="text-[var(--text-secondary)] ml-auto shrink-0" />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => onOpenChange(false)} aria-hidden />
          <div className={computedMenuClassName}>
          <div className="px-3 py-2 border-b border-[var(--border-default)] flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Switch branches/tags</span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              aria-label="Close branch menu"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3 border-b border-[var(--border-default)]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find or create a branch..."
                className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-9 pr-3 text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="border-b border-[var(--border-default)] px-2 pt-2 flex items-end gap-1 text-sm">
            <button
              type="button"
              onClick={() => setMenuTab("branches")}
              className={`h-8 px-3 rounded-t-md border border-b-0 ${
                menuTab === "branches"
                  ? "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Branches
            </button>
            <button
              type="button"
              onClick={() => setMenuTab("tags")}
              className={`h-8 px-3 rounded-t-md border border-b-0 ${
                menuTab === "tags"
                  ? "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Tags
            </button>
          </div>

          {menuTab === "branches" ? (
            <div className="max-h-[280px] overflow-auto py-1">
              {canCreateBranch ? (
                <button
                  type="button"
                  disabled={creatingBranch}
                  onClick={() => void handleCreateBranch()}
                  className="w-full px-3 py-2.5 text-left text-sm inline-flex items-center gap-2 text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] disabled:opacity-60"
                >
                  <GitBranchOcticon size={14} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="truncate">
                    {creatingBranch ? "Creating branch..." : `Create branch ${requestedBranchName} from ${activeBranch}`}
                  </span>
                </button>
              ) : null}

              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onSelectBranch(item.value);
                      resetMenu();
                    }}
                    className={`w-full px-3 py-2 text-left text-sm inline-flex items-center justify-between gap-2 hover:bg-[var(--surface-subtle)] ${
                      item.isCurrent ? "bg-[var(--surface-subtle)] text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="w-3 inline-flex items-center justify-center text-[var(--text-primary)]">
                        {item.isCurrent ? <Check size={12} /> : null}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.isDefault ? (
                      <span className="shrink-0 text-xs text-[var(--text-secondary)] border border-[var(--border-default)] rounded-full px-2 py-0.5">
                        default
                      </span>
                    ) : null}
                  </button>
                ))
              ) : canCreateBranch ? null : (
                <div className="px-3 py-6 text-sm text-[var(--text-secondary)]">No branches found.</div>
              )}
              {createError ? (
                <div className="px-3 py-2 text-xs text-[var(--text-danger)]">{createError}</div>
              ) : null}
            </div>
          ) : (
            <div className="px-3 py-6 text-sm text-[var(--text-secondary)]">No tags found.</div>
          )}

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onViewAllBranches?.();
            }}
            className="w-full text-left px-3 py-2.5 border-t border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            View all branches
          </button>
        </div>
        </>
      ) : null}
    </div>
  );
}
