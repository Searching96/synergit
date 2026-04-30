import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, GitBranch, Search, X } from "lucide-react";
import type { Branch } from "../../../types";
import TooltipButton from "../../ui/TooltipButton";

interface BranchTagMenuProps {
  branches: Branch[];
  currentBranch: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBranch: (branchName: string) => void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuAlign?: "left" | "right";
  onViewAllBranches?: () => void;
}

function isCommitLikeRef(value: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(value.trim());
}

function shortHash(hash: string): string {
  return hash.trim().slice(0, 7);
}

export default function BranchTagMenu({
  branches,
  currentBranch,
  isOpen,
  onOpenChange,
  onSelectBranch,
  className,
  triggerClassName,
  menuClassName,
  menuAlign = "left",
  onViewAllBranches,
}: BranchTagMenuProps) {
  const [menuTab, setMenuTab] = useState<"branches" | "tags">("branches");
  const [query, setQuery] = useState<string>("");

  const activeBranch = (currentBranch || "master").trim() || "master";

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

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setQuery("");
    setMenuTab("branches");
  }, [isOpen]);

  const wrapperClassName = className || "relative";
  const computedTriggerClassName = triggerClassName || "inline-flex w-full min-w-0 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-2 pr-2 h-9 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]";
  const menuAlignClassName = menuAlign === "right" ? "right-0" : "left-0";
  const computedMenuClassName = menuClassName || `absolute ${menuAlignClassName} top-[calc(100%+6px)] w-[320px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl overflow-hidden z-20`;

  return (
    <div className={wrapperClassName}>
      <TooltipButton
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className={computedTriggerClassName}
      >
        <GitBranch size={16} className="text-[var(--text-secondary)] shrink-0" />
        <span className="truncate text-base">{activeBranchLabel}</span>
        <ChevronDown size={16} className="text-[var(--text-secondary)] ml-auto shrink-0" />
      </TooltipButton>

      {isOpen ? (
        <div className={computedMenuClassName}>
          <div className="px-3 py-2 border-b border-[var(--border-default)] flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Switch branches/tags</span>
            <TooltipButton
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
              aria-label="Close branch menu"
            >
              <X size={14} />
            </TooltipButton>
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
            <TooltipButton
              type="button"
              onClick={() => setMenuTab("branches")}
              className={`h-8 px-3 rounded-t-md border border-b-0 ${
                menuTab === "branches"
                  ? "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Branches
            </TooltipButton>
            <TooltipButton
              type="button"
              onClick={() => setMenuTab("tags")}
              className={`h-8 px-3 rounded-t-md border border-b-0 ${
                menuTab === "tags"
                  ? "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Tags
            </TooltipButton>
          </div>

          {menuTab === "branches" ? (
            <div className="max-h-[280px] overflow-auto py-1">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TooltipButton
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onSelectBranch(item.value);
                      onOpenChange(false);
                      setQuery("");
                      setMenuTab("branches");
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
                  </TooltipButton>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-[var(--text-secondary)]">No branches found.</div>
              )}
            </div>
          ) : (
            <div className="px-3 py-6 text-sm text-[var(--text-secondary)]">No tags found.</div>
          )}

          <TooltipButton
            type="button"
            onClick={() => {
              onOpenChange(false);
              onViewAllBranches?.();
            }}
            className="w-full text-left px-3 py-2.5 border-t border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            View all branches
          </TooltipButton>
        </div>
      ) : null}
    </div>
  );
}
