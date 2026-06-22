import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  X,
  Settings,
  Users,
  MessageSquare,
  GitBranch,
  Tag,
  FileText,
  PlayCircle,
  Webhook,
  Bot,
  Server,
  Terminal,
  AppWindow,
  Shield,
  Key,
  Asterisk,
  LayoutGrid,
  Mail,
  ExternalLink,
  ChevronDown,
  Book,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { Repository, RepoCollaborator } from "../../../types";
import { reposApi, usersApi, collaboratorsApi } from "../../../services/api";
import { Avatar } from "../../shared/Avatar";

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  hasDropdown?: boolean;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const LEFT_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "General", icon: Settings, path: "" },
    ],
  },
  {
    title: "Access",
    items: [
      { label: "Collaborators", icon: Users, path: "access" },
      { label: "Moderation options", icon: MessageSquare, path: "moderation", hasDropdown: true },
    ],
  },
  {
    title: "Code and automation",
    items: [
      { label: "Branches", icon: GitBranch, path: "branches" },
      { label: "Tags", icon: Tag, path: "tags" },
      { label: "Rules", icon: FileText, path: "rules", hasDropdown: true },
      { label: "Actions", icon: PlayCircle, path: "actions", hasDropdown: true },
      { label: "Webhooks", icon: Webhook, path: "webhooks" },
      { label: "Copilot", icon: Bot, path: "copilot", hasDropdown: true },
      { label: "Environments", icon: Server, path: "environments" },
      { label: "Codespaces", icon: Terminal, path: "codespaces" },
      { label: "Pages", icon: AppWindow, path: "pages" },
    ],
  },
  {
    title: "Security and quality",
    items: [
      { label: "Advanced Security", icon: Shield, path: "security" },
      { label: "Deploy keys", icon: Key, path: "keys" },
      { label: "Secrets and variables", icon: Asterisk, path: "secrets", hasDropdown: true },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "GitHub Apps", icon: LayoutGrid, path: "installations" },
      { label: "Email notifications", icon: Mail, path: "notifications" },
      { label: "Autolink references", icon: ExternalLink, path: "autolinks" },
    ],
  },
];

import { useNavigate } from "react-router-dom";

interface RepoSettingsPageProps {
  repo: Repository;
  contentPath?: string;
  onRepoUpdated: (repo: Repository) => void;
  onRepoDeleted: (repoId: string) => void;
}

export default function RepoSettingsPage({ repo, contentPath = "", onRepoUpdated, onRepoDeleted }: RepoSettingsPageProps) {
  const navigate = useNavigate();
  const [visibilityPanelOpen, setVisibilityPanelOpen] = useState(false);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busyAction, setBusyAction] = useState<"visibility" | "delete" | null>(null);
  const [dangerError, setDangerError] = useState<string | null>(null);

  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; email: string } | null>(null);

  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);

  const fetchCollaborators = async () => {
    try {
      const data = await collaboratorsApi.list(repo.id);
      setCollaborators(data?.filter((c) => c.role !== "OWNER") || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void fetchCollaborators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id]);

  const handleAddCollaborator = async () => {
    if (!selectedUser) return;
    try {
      await collaboratorsApi.add(repo.id, selectedUser.id, "WRITE");
      setAddPeopleOpen(false);
      void fetchCollaborators();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await collaboratorsApi.remove(repo.id, userId);
      void fetchCollaborators();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!addPeopleOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }
  }, [addPeopleOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSelectedUser(null);
      return;
    }

    const timer = setTimeout(() => {
      usersApi.searchUsers(query).then((results) => {
        // Filter out existing collaborators here if needed (assuming repo.collaborators exists or we just rely on UI)
        setSearchResults(results);
        setSelectedUser(null);
      }).catch(console.error);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [defaultBranch, setDefaultBranch] = useState<string>("");
  const [branchInput, setBranchInput] = useState<string>("");
  const [renamingBranch, setRenamingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState<string>(repo.name);
  const [renamingRepo, setRenamingRepo] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(repo.name);
  }, [repo.name]);

  const handleRenameRepo = async () => {
    const nextName = nameInput.trim();
    if (!nextName || nextName === repo.name) {
      return;
    }

    try {
      setRenamingRepo(true);
      setNameError(null);
      const updated = await reposApi.renameRepo(repo.id, nextName);
      onRepoUpdated(updated);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "Failed to rename repository");
    } finally {
      setRenamingRepo(false);
    }
  };

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
      <aside className="py-2">
        {LEFT_NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.title || groupIndex} className={group.title ? "mt-4 pt-4 border-t border-[var(--border-muted)]" : ""}>
            {group.title && (
              <h3 className="px-3 mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">
                {group.title}
              </h3>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = contentPath === item.path || (!contentPath && item.path === "");
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => navigate(`/${repo.owner}/${repo.name}/settings${item.path ? `/${item.path}` : ""}`)}
                      className={`group flex w-full items-center justify-between py-1.5 px-3 text-[14px] leading-5 ${
                        isActive
                          ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] font-semibold rounded-r-md relative"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] hover:rounded-md"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-[2px] bottom-[2px] w-[3px] rounded-r-md bg-[var(--text-link)]" />
                      )}
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-4 w-4 ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.hasDropdown && (
                        <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      <div className="flex-1 min-w-0">
      {(!contentPath || contentPath === "general") && (
      <section className="space-y-5 min-w-0">
        <h2 className="text-[44px] leading-[1.2] font-semibold text-[var(--text-primary)]">General</h2>

        <div className="border border-[var(--border-muted)] rounded-md bg-[var(--surface-canvas)] p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Repository name</p>
            <div className="mt-2 flex items-center gap-2 max-w-[440px]">
              <input
                type="text"
                value={nameInput}
                disabled={renamingRepo}
                onChange={(event) => setNameInput(event.target.value)}
                aria-label="Repository name"
                className="h-9 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 text-sm text-[var(--text-primary)] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleRenameRepo()}
                disabled={renamingRepo || !nameInput.trim() || nameInput.trim() === repo.name}
                className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] font-semibold text-sm text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)] disabled:opacity-60"
              >
                {renamingRepo ? "Renaming..." : "Rename"}
              </button>
            </div>
            {nameError ? (
              <p className="mt-2 text-sm text-[var(--text-danger)]">{nameError}</p>
            ) : null}
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
      </section>
      )}

      {contentPath === "access" && (
        <section className="space-y-5 min-w-0">
          <div className="mb-6">
            <h2 className="text-[24px] leading-[1.2] font-normal text-[var(--text-primary)] mb-4">Collaborators and teams</h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-[var(--border-default)] rounded-md flex items-center justify-center bg-[var(--surface-canvas)]">
                  <Book className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{repo.visibility === "PRIVATE" ? "Private repository" : "Public repository"}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-snug">This repository is {repo.visibility === "PRIVATE" ? "private and visible only to people with explicit access" : "public and visible to anyone"}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setVisibilityPanelOpen(true)}
                className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] font-semibold text-sm text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
              >
                Manage visibility
              </button>
            </div>
          </div>

          <div className="mb-6 border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Direct access</h3>
              <Users className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <p className="text-[14px] text-[var(--text-secondary)]">
              {collaborators.length} collaborators have access to this repository. {collaborators.length === 0 ? "Only you can contribute to this repository." : ""}
            </p>
          </div>

          <div className="mb-6">
            {collaborators.length === 0 ? (
              <>
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">Manage access</h3>
                <div className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] py-12 px-6 flex flex-col items-center text-center">
                  <img src="https://github.githubassets.com/assets/permissions-4a54b38b5f93.png" alt="user granting permissions" className="mb-4 w-14 h-14" />
                  <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-4">You haven't invited any collaborators yet</h3>
                  <button 
                    type="button"
                    onClick={() => setAddPeopleOpen(true)}
                    className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] font-semibold text-sm text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
                  >
                    Add people
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Manage access</h3>
                  <button 
                    onClick={() => setAddPeopleOpen(true)} 
                    className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] font-semibold text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  >
                    Add people
                  </button>
                </div>
                <div className="border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)]">
                  <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--surface-subtle)]">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--focus-ring)] bg-[var(--surface-canvas)] w-4 h-4 cursor-pointer" />
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">Select all</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-1 hover:text-[var(--text-secondary)]">Type <ChevronDown className="w-4 h-4" /></button>
                      <div className="relative">
                        <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Find a collaborator..." className="pl-8 pr-3 py-1 h-8 w-56 text-[14px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] focus:border-[var(--focus-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]" />
                      </div>
                    </div>
                  </div>
                  {collaborators.map(c => (
                    <div key={c.user_id} className="px-4 py-3 border-b border-[var(--border-default)] last:border-0 flex items-center justify-between hover:bg-[var(--surface-subtle)] transition-colors group">
                      <div className="flex items-center gap-4">
                        <input type="checkbox" className="rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--focus-ring)] bg-[var(--surface-canvas)] w-4 h-4 cursor-pointer" />
                        <div className="flex items-center gap-3">
                          <Avatar username={c.username} size={32} />
                          <div className="flex flex-col">
                            <span className="text-[14px] font-semibold text-[#0969da] hover:underline cursor-pointer">{c.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[14px] text-[var(--text-secondary)] mr-2">
                          Collaborator
                        </span>
                        <button 
                          onClick={() => { handleRemoveCollaborator(c.user_id).catch(console.error); }} 
                          className="p-1.5 text-[var(--text-danger)] hover:bg-[var(--text-danger)] hover:text-white border border-[var(--border-default)] hover:border-[var(--text-danger)] rounded-md transition-colors"
                          aria-label="Remove collaborator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button className="text-[14px] font-semibold text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] disabled:opacity-50" disabled><ChevronLeft className="w-4 h-4" /> Previous</button>
                  <button className="text-[14px] font-semibold text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] disabled:opacity-50" disabled>Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {addPeopleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close add people"
            onClick={() => setAddPeopleOpen(false)}
            className="absolute inset-0 bg-[var(--overlay-backdrop)]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-people-title"
            className="relative w-full max-w-[600px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-xl p-6"
          >
            <button
              type="button"
              onClick={() => setAddPeopleOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] rounded-md p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="add-people-title" className="text-center text-[16px] font-semibold text-[var(--text-primary)] mb-4">
              Add people to {repo.name}
            </h2>
            {selectedUser ? (
              <div className="relative mb-6 mt-6">
                <div className="flex items-center justify-between border border-[#91caff] bg-[#e6f4ff] rounded-md px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar username={selectedUser.username} size={36} />
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-[14px] font-semibold text-[#0958d9]">{selectedUser.username}</span>
                    <span className="text-[13px] text-[#0958d9]">{selectedUser.username}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="text-[#0958d9] hover:bg-[#bae0ff] rounded-md p-1 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center text-[14px] font-semibold text-[var(--text-primary)] mb-2">
                  Search by username
                </div>
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find people"
                    className="w-full pl-9 pr-3 py-1.5 text-[14px] rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] focus:border-[var(--focus-ring)] focus:ring-1 focus:ring-[var(--focus-ring)] focus:outline-none transition-shadow"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto border border-[var(--border-default)] rounded-md bg-[var(--surface-canvas)] shadow-lg z-10">
                      {searchResults.map((user: any) => {
                        const isSelected = (selectedUser as any)?.id === user?.id;
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors text-left border-b border-[var(--border-muted)] last:border-0 ${isSelected ? "bg-[var(--surface-subtle)]" : ""}`}
                          >
                            <Avatar username={user.username} size={36} />
                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold text-[var(--text-primary)]">{user.username}</span>
                              <span className="text-[13px] text-[var(--text-secondary)]">Invite collaborator</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddPeopleOpen(false)}
                className="h-8 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedUser}
                onClick={() => { handleAddCollaborator().catch(console.error); }}
                className="h-8 px-4 rounded-md bg-[var(--text-success)] text-white text-[14px] font-semibold disabled:opacity-50 hover:opacity-90"
              >
                {selectedUser ? `Add ${selectedUser.username}` : "Add to repository"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
