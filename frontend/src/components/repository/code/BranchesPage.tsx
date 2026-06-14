import { useCallback, useEffect, useMemo, useState } from "react";
import { Ellipsis, Search, Trash2 } from "lucide-react";
import { OcticonCopy } from "../../icons/Octicons";
import { reposApi } from "../../../services/api/repos";
import type { Branch } from "../../../types";
import CreateBranchPopup from "./CreateBranchPopup";

interface BranchesPageProps {
  repoId: string;
  onBackToCode: () => void;
}

type TabKey = "overview" | "yours" | "active" | "stale" | "all";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "yours", label: "Yours" },
  { key: "active", label: "Active" },
  { key: "stale", label: "Stale" },
  { key: "all", label: "All" },
];

function formatRelativeTime(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
}

interface BranchRowProps {
  branch: Branch;
  isDefault: boolean;
  onDelete: (name: string) => void;
}

function BranchRow({ branch, isDefault, onDelete }: BranchRowProps) {
  const author = branch.last_author || "";
  const authorInitial = author ? author.charAt(0).toUpperCase() : "U";
  const updatedLabel = formatRelativeTime(branch.last_updated);

  return (
    <li className="px-4 py-3 border-t border-[var(--border-muted)] first:border-t-0 grid grid-cols-[minmax(220px,1.7fr)_180px_140px_70px_70px_140px_100px] gap-4 items-center text-sm">
      <div className="min-w-0 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-[var(--surface-info-subtle)] text-[var(--text-link)] px-2 py-0.5 text-xs font-mono font-semibold">
          {branch.name}
        </span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(branch.name)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Copy branch name"
        >
          <OcticonCopy size={14} />
        </button>
      </div>
      {updatedLabel ? (
        <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
          <span
            className="h-5 w-5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[10px] font-semibold text-[var(--text-primary)] inline-flex items-center justify-center shrink-0"
            title={author}
          >
            {authorInitial}
          </span>
          {updatedLabel}
        </span>
      ) : (
        <span />
      )}
      <span />
      {isDefault ? (
        <span className="col-span-2 text-center">
          <span className="inline-flex items-center rounded-full border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">Default</span>
        </span>
      ) : (
        <>
          <span className="text-right text-[var(--text-secondary)] border-r border-[var(--border-muted)] pr-2">{branch.behind_count ?? 0}</span>
          <span className="text-[var(--text-secondary)] pl-2">{branch.ahead_count ?? 0}</span>
        </>
      )}
      <span />
      <div className="flex items-center justify-end gap-2 text-[var(--text-secondary)]">
        {!isDefault ? (
          <button
            type="button"
            onClick={() => onDelete(branch.name)}
            className="hover:text-[var(--text-primary)]"
            aria-label="Delete branch"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
        <button type="button" className="hover:text-[var(--text-primary)]" aria-label="More branch actions">
          <Ellipsis size={14} />
        </button>
      </div>
    </li>
  );
}

interface BranchSectionProps {
  title: string;
  rows: Branch[];
  isDefaultSection?: boolean;
  onDelete: (name: string) => void;
}

function BranchSection({ title, rows, isDefaultSection, onDelete }: BranchSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="border border-[var(--border-default)] rounded-md overflow-hidden bg-[var(--surface-canvas)]">
        <div className="px-4 py-2 border-b border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] grid grid-cols-[minmax(220px,1.7fr)_180px_140px_70px_70px_140px_100px] gap-4">
          <span>Branch</span>
          <span>Updated</span>
          <span>Check status</span>
          <span className="text-right border-r border-[var(--border-muted)] pr-2">Behind</span>
          <span className="pl-2">Ahead</span>
          <span>Pull request</span>
          <span></span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-4 text-sm text-[var(--text-secondary)]">No branches in this section.</div>
        ) : (
          <ul>
            {rows.map((branch) => (
              <BranchRow
                key={branch.name}
                branch={branch}
                isDefault={!!isDefaultSection || branch.is_default}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function BranchesPage({ repoId, onBackToCode }: BranchesPageProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [search, setSearch] = useState("");
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reposApi.getBranches(repoId);
      setBranches(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reposApi
      .getBranches(repoId)
      .then((data) => {
        if (cancelled) return;
        setBranches(data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load branches");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [repoId]);

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete branch "${name}"? This action cannot be undone.`)) return;
    setDeletingBranch(name);
    try {
      await reposApi.deleteBranch(repoId, name);
      setBranches((prev) => prev.filter((b) => b.name !== name));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete branch");
    } finally {
      setDeletingBranch(null);
    }
  };

  const handleCreated = () => {
    setIsCreateOpen(false);
    void loadBranches();
  };

  const defaultBranch = useMemo(() => branches.find((b) => b.is_default) || null, [branches]);
  const nonDefault = useMemo(
    () => (defaultBranch ? branches.filter((b) => b.name !== defaultBranch.name) : branches),
    [branches, defaultBranch],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return { defaultBranch, nonDefault };
    return {
      defaultBranch: defaultBranch && defaultBranch.name.toLowerCase().includes(q) ? defaultBranch : null,
      nonDefault: nonDefault.filter((b) => b.name.toLowerCase().includes(q)),
    };
  }, [defaultBranch, nonDefault, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[40px] leading-[48px] font-normal text-[var(--text-primary)]">Branches</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCode}
            className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
          >
            Back to code
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 px-3 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:bg-[var(--accent-primary-hover)]"
          >
            New branch
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--border-default)] flex items-end gap-2 text-sm text-[var(--text-secondary)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`h-9 px-3 rounded-t-md ${
              activeTab === tab.key
                ? "bg-[var(--surface-canvas)] border border-[var(--border-default)] border-b-transparent text-[var(--text-primary)] font-semibold"
                : "hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search branches..."
          className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-link)]"
        />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading branches...</p>
      ) : error ? (
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
      ) : (
        <div className="space-y-6">
          {filtered.defaultBranch ? (
            <BranchSection title="Default" rows={[filtered.defaultBranch]} isDefaultSection onDelete={handleDelete} />
          ) : null}
          <BranchSection title="Your branches" rows={filtered.nonDefault} onDelete={handleDelete} />
          {deletingBranch ? (
            <p className="text-xs text-[var(--text-secondary)]">Deleting {deletingBranch}...</p>
          ) : null}
        </div>
      )}

      {isCreateOpen ? (
        <CreateBranchPopup
          repoId={repoId}
          branches={branches}
          defaultSourceName={defaultBranch?.name}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}
