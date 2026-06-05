import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { Repository } from "../../../types";
import { reposApi } from "../../../services/api";

const LEFT_NAV_GROUPS = [
  {
    title: "General",
    items: ["General", "Access", "Collaborators", "Moderation options"],
  },
  {
    title: "Code and automation",
    items: ["Branches", "Tags", "Rules", "Actions", "Webhooks"],
  },
  {
    title: "Security and quality",
    items: ["Advanced Security", "Deploy keys", "Secret and variables"],
  },
  {
    title: "Integrations",
    items: ["GitHub Apps", "Email notifications"],
  },
];

interface RepoSettingsPageProps {
  repo: Repository;
  onRepoUpdated: (repo: Repository) => void;
  onRepoDeleted: (repoId: string) => void;
}

export default function RepoSettingsPage({ repo, onRepoUpdated, onRepoDeleted }: RepoSettingsPageProps) {
  const [visibilityPanelOpen, setVisibilityPanelOpen] = useState(false);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busyAction, setBusyAction] = useState<"visibility" | "delete" | null>(null);
  const [dangerError, setDangerError] = useState<string | null>(null);

  const [defaultBranch, setDefaultBranch] = useState<string>("");
  const [branchInput, setBranchInput] = useState<string>("");
  const [renamingBranch, setRenamingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void reposApi
      .getBranches(repo.id)
      .then((branches) => {
        if (cancelled) {
          return;
        }
        const current = branches.find((branch) => branch.is_default) ?? branches[0];
        const name = current?.name ?? "";
        setDefaultBranch(name);
        setBranchInput(name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repo.id]);

  const handleRenameBranch = async () => {
    const nextName = branchInput.trim();
    if (!defaultBranch || !nextName || nextName === defaultBranch) {
      return;
    }

    try {
      setRenamingBranch(true);
      setBranchError(null);
      const renamed = await reposApi.renameBranch(repo.id, { old_name: defaultBranch, new_name: nextName });
      setDefaultBranch(renamed.name);
      setBranchInput(renamed.name);
    } catch (error) {
      setBranchError(error instanceof Error ? error.message : "Failed to rename branch");
    } finally {
      setRenamingBranch(false);
    }
  };

  const currentVisibility = useMemo(() => {
    const normalized = String(repo.visibility || "PUBLIC").trim().toUpperCase();
    return normalized === "PRIVATE" ? "PRIVATE" : "PUBLIC";
  }, [repo.visibility]);
  const nextVisibility = currentVisibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
  const visibilityLabel = currentVisibility.toLowerCase();
  const nextVisibilityLabel = nextVisibility.toLowerCase();

  const closeDangerModal = () => {
    if (busyAction) {
      return;
    }

    setVisibilityPanelOpen(false);
    setDeletePanelOpen(false);
    setDeleteConfirm("");
    setDangerError(null);
  };

  const handleChangeVisibility = async () => {
    try {
      setBusyAction("visibility");
      setDangerError(null);
      const updatedRepo = await reposApi.updateVisibility(repo.id, nextVisibility);
      onRepoUpdated(updatedRepo);
      setVisibilityPanelOpen(false);
    } catch (error) {
      setDangerError(error instanceof Error ? error.message : "Failed to change repository visibility");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteRepository = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (deleteConfirm.trim() !== repo.name) {
      setDangerError(`Type ${repo.name} to confirm deletion.`);
      return;
    }

    try {
      setBusyAction("delete");
      setDangerError(null);
      await reposApi.deleteRepo(repo.id);
      onRepoDeleted(repo.id);
    } catch (error) {
      setDangerError(error instanceof Error ? error.message : "Failed to delete repository");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-4">
      <aside className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] py-3">
        {LEFT_NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="px-4 text-xs uppercase tracking-wide font-semibold text-[var(--text-secondary)]">{group.title}</p>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`w-full px-4 py-1.5 text-left text-sm ${
                    group.title === "General" && index === 0
                      ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] border-l-2 border-[var(--text-link)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <section className="space-y-5 min-w-0">
        <h2 className="text-[44px] leading-[1.2] font-semibold text-[var(--text-primary)]">General</h2>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Repository name</p>
            <div className="mt-2 flex items-center gap-2 max-w-[440px]">
              <input
                type="text"
                readOnly
                value={repo.name}
                className="h-9 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
              />
              <button type="button" className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] font-semibold text-sm text-[var(--text-primary)]">
                Rename
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Default branch</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              The default branch in this repository is {defaultBranch || "—"}.
            </p>
            <div className="mt-2 flex items-center gap-2 max-w-[440px]">
              <input
                type="text"
                value={branchInput}
                disabled={!defaultBranch || renamingBranch}
                onChange={(event) => setBranchInput(event.target.value)}
                aria-label="Default branch name"
                className="h-9 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)] disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-secondary)]"
              />
              <button
                type="button"
                onClick={() => void handleRenameBranch()}
                disabled={!defaultBranch || renamingBranch || !branchInput.trim() || branchInput.trim() === defaultBranch}
                className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] font-semibold text-sm text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)] disabled:opacity-60"
              >
                {renamingBranch ? "Renaming..." : "Rename"}
              </button>
            </div>
            {branchError ? (
              <p className="mt-2 text-sm text-[var(--text-danger)]">{branchError}</p>
            ) : null}
          </div>
        </div>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Features</p>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Wikis</span>
              <span className="block text-[var(--text-secondary)]">Wikis host documentation for your repository.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Issues</span>
              <span className="block text-[var(--text-secondary)]">Issues integrate lightweight task tracking into your repository.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Pull requests</span>
              <span className="block text-[var(--text-secondary)]">Pull requests offer a way to suggest changes in your repository.</span>
            </span>
          </label>
        </div>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <p className="text-lg font-semibold text-[var(--text-primary)]">Pull Requests</p>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow merge commits</span>
              <span className="block text-[var(--text-secondary)]">Add all commits from the head branch to the base branch with a merge commit.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow squash merging</span>
              <span className="block text-[var(--text-secondary)]">Combine all commits from the head branch into a single commit in the base branch.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked readOnly className="mt-1" />
            <span>
              <span className="font-semibold">Allow rebase merging</span>
              <span className="block text-[var(--text-secondary)]">Add all commits from the head branch onto the base branch individually.</span>
            </span>
          </label>
        </div>

        <div className="border border-[var(--text-danger)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-3">
          <p className="text-lg font-semibold text-[var(--text-danger)] inline-flex items-center gap-2">
            <AlertTriangle size={18} />
            Danger Zone
          </p>

          <div className="border border-[var(--border-danger-muted)] rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Change repository visibility</p>
              <p className="text-sm text-[var(--text-secondary)]">This repository is currently {visibilityLabel}.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDangerError(null);
                setDeletePanelOpen(false);
                setVisibilityPanelOpen(true);
              }}
              className="h-8 px-3 rounded-md border border-[var(--text-danger)] text-[var(--text-danger)] text-sm font-semibold bg-[var(--surface-canvas)] hover:bg-[var(--surface-danger-subtle)]"
            >
              Change visibility
            </button>
          </div>

          <div className="border border-[var(--border-danger-muted)] rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Delete this repository</p>
              <p className="text-sm text-[var(--text-secondary)]">Once you delete a repository, there is no going back.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDangerError(null);
                setVisibilityPanelOpen(false);
                setDeletePanelOpen(true);
              }}
              className="h-8 px-3 rounded-md border border-[var(--text-danger)] text-[var(--text-danger)] text-sm font-semibold bg-[var(--surface-canvas)] hover:bg-[var(--surface-danger-subtle)]"
            >
              Delete repository
            </button>
          </div>

          {dangerError ? (
            <p className="text-sm text-[var(--text-danger)]">{dangerError}</p>
          ) : null}
        </div>
      </section>

      {visibilityPanelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close change visibility confirmation"
            onClick={closeDangerModal}
            className="absolute inset-0 bg-[var(--overlay-backdrop)]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-visibility-title"
            className="relative w-full max-w-[520px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl"
          >
            <div className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center justify-between gap-3">
              <p id="change-visibility-title" className="text-base font-semibold text-[var(--text-primary)]">
                Change this repository to {nextVisibilityLabel}?
              </p>
              <button
                type="button"
                disabled={busyAction === "visibility"}
                onClick={closeDangerModal}
                className="h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center disabled:opacity-60"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-[var(--text-secondary)]">
                This updates the repository visibility shown across Synergit.
              </p>
              {dangerError ? (
                <p className="mt-3 text-sm text-[var(--text-danger)]">{dangerError}</p>
              ) : null}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-muted)] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={busyAction === "visibility"}
                onClick={closeDangerModal}
                className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction === "visibility"}
                onClick={() => void handleChangeVisibility()}
                className="h-8 px-3 rounded-md bg-[var(--text-danger)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {busyAction === "visibility" ? "Changing..." : `Change to ${nextVisibilityLabel}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletePanelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close delete repository confirmation"
            onClick={closeDangerModal}
            className="absolute inset-0 bg-[var(--overlay-backdrop)]"
          />
          <form
            onSubmit={handleDeleteRepository}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-repository-title"
            className="relative w-full max-w-[520px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl"
          >
            <div className="px-4 py-3 border-b border-[var(--border-muted)] flex items-center justify-between gap-3">
              <p id="delete-repository-title" className="text-base font-semibold text-[var(--text-primary)]">
                Confirm repository deletion
              </p>
              <button
                type="button"
                disabled={busyAction === "delete"}
                onClick={closeDangerModal}
                className="h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center disabled:opacity-60"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Type <span className="font-semibold text-[var(--text-primary)]">{repo.name}</span> to permanently delete this repository.
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className="mt-3 h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
                aria-label="Repository deletion confirmation"
              />
              {dangerError ? (
                <p className="mt-3 text-sm text-[var(--text-danger)]">{dangerError}</p>
              ) : null}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-muted)] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={busyAction === "delete"}
                onClick={closeDangerModal}
                className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyAction === "delete" || deleteConfirm.trim() !== repo.name}
                className="h-8 px-3 rounded-md bg-[var(--text-danger)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {busyAction === "delete" ? "Deleting..." : "Delete this repository"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
