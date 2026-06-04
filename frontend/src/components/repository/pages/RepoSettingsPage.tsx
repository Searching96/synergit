import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
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

  const currentVisibility = useMemo(() => {
    const normalized = String(repo.visibility || "PUBLIC").trim().toUpperCase();
    return normalized === "PRIVATE" ? "PRIVATE" : "PUBLIC";
  }, [repo.visibility]);
  const nextVisibility = currentVisibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
  const visibilityLabel = currentVisibility.toLowerCase();
  const nextVisibilityLabel = nextVisibility.toLowerCase();

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
              <button type="button" className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]">
                Rename
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Default branch</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">The default branch in this repository is master.</p>
            <div className="mt-2 max-w-[240px]">
              <input
                type="text"
                readOnly
                value="master"
                className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] px-3 text-sm text-[var(--text-secondary)]"
              />
            </div>
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
                setVisibilityPanelOpen((open) => !open);
              }}
              className="h-8 px-3 rounded-md border border-[var(--text-danger)] text-[var(--text-danger)] text-sm font-semibold bg-[var(--surface-canvas)] hover:bg-[var(--surface-danger-subtle)]"
            >
              Change visibility
            </button>
          </div>

          {visibilityPanelOpen ? (
            <div className="border border-[var(--border-danger-muted)] rounded-md p-3 bg-[var(--surface-danger-subtle)]">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Change this repository to {nextVisibilityLabel}?
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                This updates the repository visibility shown across Synergit.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyAction === "visibility"}
                  onClick={() => void handleChangeVisibility()}
                  className="h-8 px-3 rounded-md bg-[var(--text-danger)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "visibility" ? "Changing..." : `Change to ${nextVisibilityLabel}`}
                </button>
                <button
                  type="button"
                  disabled={busyAction === "visibility"}
                  onClick={() => setVisibilityPanelOpen(false)}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

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
                setDeletePanelOpen((open) => !open);
              }}
              className="h-8 px-3 rounded-md border border-[var(--text-danger)] text-[var(--text-danger)] text-sm font-semibold bg-[var(--surface-canvas)] hover:bg-[var(--surface-danger-subtle)]"
            >
              Delete repository
            </button>
          </div>

          {deletePanelOpen ? (
            <form onSubmit={handleDeleteRepository} className="border border-[var(--border-danger-muted)] rounded-md p-3 bg-[var(--surface-danger-subtle)]">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Confirm repository deletion</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Type <span className="font-semibold text-[var(--text-primary)]">{repo.name}</span> to permanently delete this repository.
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className="mt-3 h-9 w-full max-w-md rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)]"
                aria-label="Repository deletion confirmation"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={busyAction === "delete" || deleteConfirm.trim() !== repo.name}
                  className="h-8 px-3 rounded-md bg-[var(--text-danger)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {busyAction === "delete" ? "Deleting..." : "Delete this repository"}
                </button>
                <button
                  type="button"
                  disabled={busyAction === "delete"}
                  onClick={() => {
                    setDeletePanelOpen(false);
                    setDeleteConfirm("");
                  }}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {dangerError ? (
            <p className="text-sm text-[var(--text-danger)]">{dangerError}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

